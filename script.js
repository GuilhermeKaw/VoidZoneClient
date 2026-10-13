(() => {
  const MAX = 16;                 
  const PREFIX = 'visor1-';       
  const $ = id => document.getElementById(id);

  let peer = null, myId = '', slot = -1, room = '', myName = '', sweep = null;
  let localStream = null;
  const conns = new Map();       
  const names = new Map();       
  const outCalls = new Map();    
  const inCalls = new Map();     
  const tiles = new Map();       

  const idFor = (r, n) => PREFIX + r + '-' + n;
  const clean = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 24);
  const msg = t => { $('lobbyMsg').textContent = t; };
  
  function toast(t) {
    const el = $('toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toast('Use o botão de tela cheia no canto do vídeo para evitar falhas de imagem.');
    }
  });

  const fromHash = location.hash.match(/sala=([a-z0-9]+)/i);
  if (fromHash) $('code').value = fromHash[1];

  $('gen').onclick = () => {
    const a = 'abcdefghjkmnpqrstuvwxyz23456789';
    $('code').value = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => a[b % a.length]).join('');
  };
  
  $('form').onsubmit = e => { e.preventDefault(); enter(); };

  async function enter() {
    room = clean($('code').value);
    myName = ($('name').value.trim() || 'Visitante').slice(0, 20);
    
    if (!room) { msg('Digite um código de sala usando letras e números.'); return; }
    if (typeof Peer === 'undefined') { msg('Falha de biblioteca. Verifique a internet.'); return; }
    
    msg('Estabelecendo conexão P2P...'); $('join').disabled = true;
    
    try { await claimSlot(); }
    catch (err) { msg(err.message); $('join').disabled = false; return; }
    
    $('join').disabled = false; msg('');
    $('lobby').hidden = true; $('room').hidden = false;
    $('roomLabel').textContent = room;
    history.replaceState(null, '', '#sala=' + room);
    
    $('share').disabled = !(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    discover();
    sweep = setInterval(() => { if (peer && !peer.disconnected) discover(); }, 20000);
    renderAll();
  }

  function claimSlot() {
    return new Promise((resolve, reject) => {
      let n = 0;
      const attempt = () => {
        if (n >= MAX) return reject(new Error('Sala cheia (limite: ' + MAX + ').'));
        const mine = n;
        
        // ADIÇÃO DOS SERVIDORES STUN PARA FURAR FIREWALLS NAT
        const p = new Peer(idFor(room, mine), {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });
        
        let settled = false;
        const timer = setTimeout(() => { if (!settled) { settled = true; p.destroy(); reject(new Error('Timeout.')); } }, 12000);
        p.on('open', id => { if (settled) return; settled = true; clearTimeout(timer); peer = p; slot = mine; myId = id; wire(p); resolve(); });
        p.on('error', err => {
          if (settled) return;
          settled = true; clearTimeout(timer); p.destroy();
          if (err.type === 'unavailable-id') { n++; attempt(); }
          else reject(new Error('Erro de conexão ao servidor PeerJS.'));
        });
      };
      attempt();
    });
  }

  function wire(p) {
    p.on('connection', setupConn);
    p.on('call', call => { call.answer(); trackIn(call); });
    p.on('disconnected', () => { if (!p.destroyed) p.reconnect(); });
    p.on('error', err => { if (err.type !== 'peer-unavailable') console.warn('Visor:', err.type); });
  }

  function discover() {
    for (let j = 0; j < MAX; j++) {
      if (j === slot) continue;
      const pid = idFor(room, j);
      if (conns.has(pid)) continue;
      const c = peer.connect(pid, { reliable: true });
      c._out = true;
      setupConn(c);
      setTimeout(() => { if (!c.open) c.close(); }, 8000);
    }
  }

  function setupConn(c) {
    const pid = c.peer;
    c.on('open', () => {
      const old = conns.get(pid);
      if (old && old !== c && old.open) {
        const starter = x => x._out ? myId : pid;
        if (starter(c) < starter(old)) old.close(); else { c.close(); return; }
      }
      conns.set(pid, c);
      c.send({ t: 'hello', name: myName });
      if (localStream) callPeer(pid);
      renderAll();
    });
    c.on('data', d => {
      if (!d || typeof d !== 'object') return;
      if (d.t === 'hello') { names.set(pid, String(d.name || 'Visitante').slice(0, 20)); relabel(pid); renderAll(); }
      else if (d.t === 'share' && !d.on) removeTile(pid);
    });
    c.on('close', () => { if (conns.get(pid) === c) dropPeer(pid); });
    c.on('error', () => {});
  }

  function dropPeer(pid) {
    const who = names.get(pid);
    conns.delete(pid); names.delete(pid);
    const o = outCalls.get(pid); if (o) { outCalls.delete(pid); o.close(); }
    const i = inCalls.get(pid); if (i) { inCalls.delete(pid); i.close(); }
    removeTile(pid);
    if (who) toast(who + ' desconectou.');
    tune(); renderAll();
  }

  const broadcast = data => conns.forEach(c => { if (c.open) c.send(data); });

  function getVideoConstraints() {
    const fps = parseInt($('fpsSelect').value, 10);
    const res = parseInt($('resSelect').value, 10);
    return {
      frameRate: { ideal: fps, max: fps },
      height: { ideal: res }
    };
  }

  async function updateLiveSettings() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints(getVideoConstraints());
        toast('Configurações de transmissão atualizadas.');
      } catch (err) {
        toast('Seu navegador não suporta alterar essa configuração com a tela ativa.');
      }
    }
  }

  $('fpsSelect').addEventListener('change', updateLiveSettings);
  $('resSelect').addEventListener('change', updateLiveSettings);

  function callPeer(pid) {
    if (!localStream || !peer) return;
    const prev = outCalls.get(pid); if (prev) { outCalls.delete(pid); prev.close(); }
    const call = peer.call(pid, localStream, { metadata: { name: myName } });
    if (!call) return;
    outCalls.set(pid, call);
    call.on('close', () => { if (outCalls.get(pid) === call) outCalls.delete(pid); });
    setTimeout(tune, 1200); setTimeout(tune, 5000);
  }

  function trackIn(call) {
    const pid = call.peer;
    const prev = inCalls.get(pid); if (prev && prev !== call) prev.close();
    inCalls.set(pid, call);
    call.on('stream', s => addTile(pid, s));
    call.on('close', () => { if (inCalls.get(pid) === call) { inCalls.delete(pid); removeTile(pid); } });
  }

  function tune() {
    const n = outCalls.size; if (!n) return;
    const per = Math.max(250e3, Math.min(4e6, Math.floor(6e6 / n)));
    outCalls.forEach(call => {
      const pc = call.peerConnection; if (!pc) return;
      pc.getSenders().forEach(s => {
        if (!s.track || s.track.kind !== 'video') return;
        try {
          const p = s.getParameters();
          if (!p.encodings || !p.encodings.length) p.encodings = [{}];
          p.encodings[0].maxBitrate = per;
          s.setParameters(p).catch(() => {});
        } catch {}
      });
    });
  }

  async function startShare() {
    try {
      localStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: getVideoConstraints(), 
        audio: false 
      });
    } catch (e) {
      if (e && e.name !== 'NotAllowedError') toast('Erro ao capturar tela.');
      return;
    }
    const track = localStream.getVideoTracks()[0];
    // ALTERAÇÃO PARA PRIORIZAR FLUIDEZ DE MOVIMENTO E EVITAR TRAVADAS DO MOUSE
    try { track.contentHint = 'motion'; } catch {} 
    
    track.addEventListener('ended', stopShare);
    addTile('self', localStream);
    conns.forEach((_, pid) => callPeer(pid));
    renderAll();
  }

  function stopShare() {
    if (!localStream) return;
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
    outCalls.forEach(c => c.close()); outCalls.clear();
    broadcast({ t: 'share', on: false });
    removeTile('self'); renderAll();
  }

  function labelFor(pid) { return pid === 'self' ? 'Você' : (names.get(pid) || 'Participante'); }

  function addTile(pid, stream) {
    let t = tiles.get(pid);
    if (!t) {
      const el = document.createElement('article'); el.className = 'tile';
      const video = document.createElement('video');
      video.autoplay = true; video.muted = true; video.playsInline = true;
      const bar = document.createElement('div'); bar.className = 'tilebar';
      const who = document.createElement('div'); who.className = 'who';
      const label = document.createElement('span'); who.append(label);
      const fs = document.createElement('button'); fs.type = 'button'; fs.className = 'btn'; fs.innerHTML = '<i class="fa-solid fa-expand"></i>';
      
      const toggleFS = () => {
        el.classList.toggle('fullscreen-mode');
        if (el.classList.contains('fullscreen-mode')) {
          fs.innerHTML = '<i class="fa-solid fa-compress"></i>';
        } else {
          fs.innerHTML = '<i class="fa-solid fa-expand"></i>';
        }
      };

      fs.onclick = e => { e.stopPropagation(); toggleFS(); };
      el.addEventListener('dblclick', () => { toggleFS(); });

      bar.append(who, fs); el.append(video, bar);
      $('grid').append(el);
      t = { el, video, label }; tiles.set(pid, t);
    }
    if (t.video.srcObject !== stream) t.video.srcObject = stream;
    t.label.textContent = labelFor(pid);
    const play = t.video.play(); if (play && play.catch) play.catch(() => {});
    renderAll();
  }

  function relabel(pid) { const t = tiles.get(pid); if (t) t.label.textContent = labelFor(pid); }
  function removeTile(pid) {
    const t = tiles.get(pid); if (!t) return;
    t.video.srcObject = null; t.el.remove(); tiles.delete(pid); renderAll();
  }

  function renderAll() {
    const box = $('people'); box.replaceChildren();
    const list = [{ name: myName + ' (Você)', live: !!localStream }]
      .concat([...conns.keys()].map(pid => ({ name: names.get(pid) || 'Participante', live: tiles.has(pid) })));
    list.forEach(p => {
      const s = document.createElement('div'); s.className = 'chip' + (p.live ? ' live' : '');
      s.title = p.live ? 'Transmitindo' : 'Ouvindo';
      const dot = document.createElement('i'), txt = document.createElement('span'); txt.textContent = p.name;
      s.append(dot, txt); box.append(s);
    });
    const n = list.length;
    $('count').textContent = n + ' CONECTADO' + (n === 1 ? '' : 'S');
    
    const sharing = !!localStream;
    $('share').innerHTML = sharing ? '<i class="fa-solid fa-stop"></i> Parar' : '<i class="fa-solid fa-desktop"></i> Compartilhar';
    $('share').classList.toggle('live', sharing); 
    
    const empty = $('empty'); empty.hidden = tiles.size > 0;
  }

  $('share').onclick = () => localStream ? stopShare() : startShare();
  $('copy').onclick = async () => {
    const link = location.origin + location.pathname + '#sala=' + room;
    try { await navigator.clipboard.writeText(link); toast('Link P2P copiado para a área de transferência.'); }
    catch { window.prompt('Copie o link da sala:', link); }
  };
  $('leave').onclick = leave;
  window.addEventListener('beforeunload', () => { if (peer) peer.destroy(); });

  function leave() {
    stopShare(); clearInterval(sweep);
    conns.forEach(c => c.close()); conns.clear(); names.clear();
    outCalls.clear(); inCalls.forEach(c => c.close()); inCalls.clear();
    [...tiles.keys()].forEach(removeTile);
    if (peer) { peer.destroy(); peer = null; }
    history.replaceState(null, '', location.pathname);
    
    $('name').value = '';
    $('code').value = '';
    
    $('room').hidden = true; $('lobby').hidden = false;
  }
})();