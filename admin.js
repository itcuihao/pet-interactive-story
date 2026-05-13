// ─── State ───
let story = null, selectedNode = null;
let lf = null; // LogicFlow instance
let saveTimeout = null;
const STORAGE_KEY = 'interactive-video-story';
const SCENES = ['bg-bedroom','bg-kitchen','bg-windowsill','bg-livingroom','bg-sunbeam','bg-door','bg-night','bg-ending'];
const SCENE_NAMES = {'bg-bedroom':'卧室','bg-kitchen':'厨房','bg-windowsill':'窗台','bg-livingroom':'客厅','bg-sunbeam':'阳光','bg-door':'门口','bg-night':'夜晚','bg-ending':'结局'};

// ─── DOM helpers ───
function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'text') e.textContent = v;
    else if (k === 'cls') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v);
  });
  if (children) children.forEach(c => { if (c) e.appendChild(c); });
  return e;
}
function sel(s) { return document.querySelector(s); }

// ─── Init ───
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initLogicFlow();
  renderSidePanels();
  setupToolbar();
});

function setupToolbar() {
  sel('#btn-new').onclick = newStory;
  sel('#btn-save').onclick = saveStory;
  sel('#btn-export').onclick = exportJSON;
  sel('#btn-import').onclick = () => sel('#import-input').click();
  sel('#import-input').onchange = importJSON;
  sel('#btn-clear-cache').onclick = clearCache;
  sel('#btn-preview').onclick = previewPlay;
  sel('#btn-add-node').onclick = addNode;
  sel('#node-search').oninput = renderNodeList;
  sel('#setting-start').onchange = function(){ story.startNode = this.value; scheduleSave(); refreshCanvas(); renderNodeList(); };
  sel('#setting-energy').onchange = function(){ setVar('energy', +this.value); };
  sel('#setting-mood').onchange = function(){ setVar('mood', +this.value); };
  sel('#setting-fullness').onchange = function(){ setVar('fullness', +this.value); };
  sel('#toolbar-story-name').oninput = scheduleSave;
}
function setVar(k,v){ if(!story.variables)story.variables={}; story.variables[k]=Math.max(0,Math.min(100,v)); scheduleSave(); }

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { story = JSON.parse(saved); return; }
  } catch(e) {}
  story = getDefaultStory();
}

// ─── LogicFlow: Register custom node & init ───
function initLogicFlow() {
  const { HtmlNode, HtmlNodeModel } = Core;

  // Custom HTML node: StoryNode
  class StoryNodeView extends HtmlNode {
    setHtml(rootEl) {
      const { id, properties } = this.props.model;
      const node = story.nodes[id];
      if (!node) { rootEl.textContent = ''; return; }

      const wrap = document.createElement('div');
      wrap.className = 'lf-story-node';

      // Header
      const hdr = document.createElement('div');
      hdr.className = 'sn-header';
      const label = (story.treeLabels && story.treeLabels[id]) || node.title || id;
      hdr.appendChild(document.createTextNode(label));
      if (node.ending) { const b = document.createElement('span'); b.className = 'sn-badge ending'; b.textContent = '结局'; hdr.appendChild(b); }
      if (id === story.startNode) { const b = document.createElement('span'); b.className = 'sn-badge start'; b.textContent = '起点'; hdr.appendChild(b); }
      if (node.videoUrl) { const b = document.createElement('span'); b.className = 'sn-badge video'; b.textContent = '视频'; hdr.appendChild(b); }
      wrap.appendChild(hdr);

      // Body
      if (node.text) {
        const body = document.createElement('div');
        body.className = 'sn-body';
        body.textContent = node.text.slice(0, 80) + (node.text.length > 80 ? '...' : '');
        wrap.appendChild(body);
      }

      // Choices preview
      if (node.choices && node.choices.length) {
        const cd = document.createElement('div');
        cd.className = 'sn-choices';
        node.choices.forEach(ch => {
          const row = document.createElement('div');
          row.className = 'sn-choice';
          row.textContent = ch.text || '(空)';
          cd.appendChild(row);
        });
        wrap.appendChild(cd);
      }

      rootEl.textContent = '';
      rootEl.appendChild(wrap);
    }
  }

  class StoryNodeModel extends HtmlNodeModel {
    initNodeData(data) {
      super.initNodeData(data);
      this.width = 200;
      this.height = this.calcHeight(data.id);
    }
    calcHeight(id) {
      const node = story.nodes[id];
      if (!node) return 80;
      let h = 36; // header
      if (node.text) h += 52; // body
      if (node.choices && node.choices.length) h += 8 + node.choices.length * 18; // choices
      return Math.max(60, h);
    }
    getNodeStyle() {
      const style = super.getNodeStyle();
      style.stroke = 'none';
      style.fill = 'transparent';
      return style;
    }
    getDefaultAnchor() {
      const { x, y, width, height, id } = this;
      // Left anchor (input)
      const anchors = [
        { x: x - width / 2, y, type: 'left', id: id + '_left' }
      ];
      // Right anchor per choice (output)
      const node = story.nodes[id];
      if (node && node.choices && node.choices.length) {
        const headerH = 36;
        const bodyH = node.text ? 52 : 0;
        const choicesStartY = y - height / 2 + headerH + bodyH + 8;
        node.choices.forEach((ch, i) => {
          anchors.push({
            x: x + width / 2,
            y: choicesStartY + i * 18 + 9,
            type: 'right',
            id: id + '_choice_' + i
          });
        });
      } else {
        // Single right anchor if no choices
        anchors.push({ x: x + width / 2, y, type: 'right', id: id + '_right' });
      }
      return anchors;
    }
  }

  lf = new Core.default({
    container: document.querySelector('#lf-container'),
    grid: { size: 20, visible: true, type: 'dot' },
    background: { backgroundColor: '#151110' },
    edgeType: 'bezier',
    snapline: true,
    keyboard: { enabled: true },
    style: {
      nodeText: { color: '#e8dcc8', fontSize: 12 },
      edgeText: { color: '#8a7d6b', fontSize: 10 },
      bezier: { stroke: 'rgba(245,166,35,0.5)', strokeWidth: 2 },
      polyline: { stroke: 'rgba(245,166,35,0.5)', strokeWidth: 2 },
      arrow: { offset: 6, verticalLength: 3 },
      anchor: { stroke: '#1a1410', fill: '#f5a623', r: 5 },
      anchorHover: { fill: '#ffd600', r: 8 },
      anchorLine: { stroke: '#f5a623', strokeDasharray: '4 4' },
    },
  });

  lf.register({
    type: 'story-node',
    view: StoryNodeView,
    model: StoryNodeModel,
  });

  // Events
  lf.on('node:click', ({ data }) => {
    selectNode(data.id);
  });
  lf.on('blank:click', () => {
    selectedNode = null;
    renderNodeList();
    renderRightPanel(null);
  });
  lf.on('node:mousemove', () => {}); // keep nodes interactive
  lf.on('node:drop', ({ data }) => {
    // Save position after drag
    syncPositionsFromLf();
    scheduleSave();
  });
  lf.on('edge:add', ({ data }) => {
    // When a new edge is drawn, update story data
    handleEdgeAdd(data);
  });
  lf.on('edge:delete', ({ data }) => {
    handleEdgeDelete(data);
  });

  // Render the graph
  renderLogicFlowData();
  setTimeout(() => lf.fitView(80), 100);
}

// ─── Convert story data to LogicFlow format ───
function storyToLfData() {
  const nodes = [];
  const edges = [];
  const positions = story._canvasPositions || {};
  const ids = Object.keys(story.nodes);

  // Auto-layout if no positions
  if (!ids.some(id => positions[id])) {
    autoLayout(ids, positions);
  }

  ids.forEach(id => {
    const pos = positions[id] || { x: 200, y: 200 };
    const node = story.nodes[id];
    const choiceCount = (node.choices && node.choices.length) || 0;
    let h = 36 + (node.text ? 52 : 0) + (choiceCount ? 8 + choiceCount * 18 : 0);
    h = Math.max(60, h);
    nodes.push({
      id,
      type: 'story-node',
      x: pos.x,
      y: pos.y,
      properties: {},
    });

    // Create edges from choices
    if (node.choices) {
      node.choices.forEach((ch, i) => {
        if (ch.next && story.nodes[ch.next]) {
          edges.push({
            id: id + '__to__' + ch.next + '__' + i,
            type: 'bezier',
            sourceNodeId: id,
            targetNodeId: ch.next,
            sourceAnchorId: id + '_choice_' + i,
            targetAnchorId: ch.next + '_left',
            text: ch.text ? (ch.text.length > 8 ? ch.text.slice(0, 8) + '..' : ch.text) : '',
          });
        }
      });
    }
  });

  return { nodes, edges };
}

function autoLayout(ids, positions) {
  const visited = new Set(), layers = [], queue = [story.startNode || ids[0]];
  if (queue[0]) visited.add(queue[0]);
  while (queue.length) {
    const layer = [...queue]; layers.push(layer); queue.length = 0;
    for (const id of layer) {
      const node = story.nodes[id];
      if (!node || !node.choices) continue;
      for (const ch of node.choices) {
        if (ch.next && !visited.has(ch.next) && story.nodes[ch.next]) { visited.add(ch.next); queue.push(ch.next); }
      }
    }
  }
  const rem = ids.filter(id => !visited.has(id));
  if (rem.length) layers.push(rem);
  layers.forEach((layer, col) => {
    const totalH = layer.length * 160;
    layer.forEach((id, row) => {
      positions[id] = { x: col * 300 + 200, y: row * 160 - totalH / 2 + 400 };
    });
  });
}

function renderLogicFlowData() {
  const data = storyToLfData();
  lf.render(data);
}

function refreshCanvas() {
  syncPositionsFromLf();
  renderLogicFlowData();
}

function syncPositionsFromLf() {
  if (!lf) return;
  const graphData = lf.getGraphRawData();
  if (!story._canvasPositions) story._canvasPositions = {};
  graphData.nodes.forEach(n => {
    story._canvasPositions[n.id] = { x: n.x, y: n.y };
  });
}

// ─── Handle edge add/delete from LogicFlow ───
function handleEdgeAdd(edgeData) {
  const { sourceNodeId, targetNodeId, sourceAnchorId } = edgeData;
  const node = story.nodes[sourceNodeId];
  if (!node) return;

  // Figure out which choice index this anchor corresponds to
  let choiceIdx = -1;
  if (sourceAnchorId) {
    const match = sourceAnchorId.match(/_choice_(\d+)$/);
    if (match) choiceIdx = parseInt(match[1]);
  }

  if (choiceIdx >= 0 && node.choices && node.choices[choiceIdx]) {
    node.choices[choiceIdx].next = targetNodeId;
  } else if (choiceIdx === -1) {
    // Connected from the generic right anchor; add a new choice
    if (!node.choices) node.choices = [];
    node.choices.push({ text: '新选项', next: targetNodeId, effects: {} });
  }
  scheduleSave();
  if (selectedNode === sourceNodeId) renderRightPanel(selectedNode);
  showToast('连线完成');
}

function handleEdgeDelete(edgeData) {
  const { sourceNodeId, sourceAnchorId } = edgeData;
  const node = story.nodes[sourceNodeId];
  if (!node || !node.choices) return;
  if (sourceAnchorId) {
    const match = sourceAnchorId.match(/_choice_(\d+)$/);
    if (match) {
      const idx = parseInt(match[1]);
      if (node.choices[idx]) {
        node.choices[idx].next = '';
      }
    }
  }
  scheduleSave();
  if (selectedNode === sourceNodeId) renderRightPanel(selectedNode);
}

// ─── Render side panels ───
function renderSidePanels() {
  sel('#toolbar-story-name').value = story.name || '';
  renderExampleList();
  renderNodeList();
  renderSettings();
}

function renderExampleList() {
  const list = sel('#example-list');
  list.textContent = '';
  EXAMPLES.forEach(ex => {
    const item = el('div', { cls: 'example-item' });
    item.appendChild(el('span', { cls: 'ex-icon', text: ex.icon }));
    const info = el('div', { cls: 'ex-info' });
    info.appendChild(el('div', { cls: 'ex-name', text: ex.name }));
    info.appendChild(el('div', { cls: 'ex-desc', text: ex.desc }));
    info.appendChild(el('div', { cls: 'ex-meta', text: ex.nodes + ' nodes · ' + ex.edges + ' edges' }));
    item.appendChild(info);
    item.addEventListener('click', () => loadExample(ex.id));
    list.appendChild(item);
  });
}

function loadExample(id) {
  const data = getExampleStory(id);
  if (!data) return;
  if (Object.keys(story.nodes).length > 1 && !confirm('加载示例将替换当前故事，继续吗？')) return;
  story = data;
  selectedNode = null;
  refreshCanvas();
  renderSidePanels();
  renderRightPanel(null);
  scheduleSave();
  setTimeout(() => lf.fitView(80), 100);
  showToast('已加载示例: ' + data.name);
}

function renderNodeList() {
  const list = sel('#node-list');
  const search = sel('#node-search').value.toLowerCase();
  list.textContent = '';
  Object.keys(story.nodes).forEach(id => {
    const node = story.nodes[id];
    const label = (story.treeLabels && story.treeLabels[id]) || node.title || id;
    if (search && !label.toLowerCase().includes(search) && !id.toLowerCase().includes(search)) return;
    const cls = 'node-list-item' + (id === selectedNode ? ' selected' : '') + (node.ending ? ' is-ending' : '') + (id === story.startNode ? ' is-start' : '');
    const item = el('div', { cls, text: label, title: id });
    item.addEventListener('click', () => selectNode(id));
    item.addEventListener('dblclick', () => { if (lf) lf.focusOn({ id }); });
    list.appendChild(item);
  });
}

function renderSettings() {
  const s = sel('#setting-start');
  s.textContent = '';
  Object.keys(story.nodes).forEach(id => {
    const o = el('option', { value: id, text: (story.treeLabels && story.treeLabels[id]) || id });
    if (id === story.startNode) o.selected = true;
    s.appendChild(o);
  });
  const v = story.variables || {};
  sel('#setting-energy').value = v.energy || 0;
  sel('#setting-mood').value = v.mood || 0;
  sel('#setting-fullness').value = v.fullness || 0;
}

// ─── Select node ───
function selectNode(id) {
  selectedNode = id;
  renderNodeList();
  renderRightPanel(id);
  // Highlight in LogicFlow
  if (lf) {
    lf.clearSelectElements();
    try { lf.selectElementById(id); } catch(e) {}
  }
}

// ─── Right panel ───
function renderRightPanel(id) {
  const empty = sel('#right-empty-msg'), form = sel('#right-form');
  if (!id || !story.nodes[id]) { empty.style.display = ''; form.style.display = 'none'; return; }
  empty.style.display = 'none'; form.style.display = '';
  form.textContent = '';
  const node = story.nodes[id], allIds = Object.keys(story.nodes);

  // Basic info
  const s1 = makeSection('基本信息');
  s1.appendChild(makeTextRow('节点 ID', id, v => renameNode(id, v), 'change'));
  s1.appendChild(makeTextRow('标题', node.title || '', v => { node.title = v; scheduleSave(); refreshCanvas(); renderNodeList(); }));
  s1.appendChild(makeTextRow('列表标签', (story.treeLabels && story.treeLabels[id]) || '', v => { if (!story.treeLabels) story.treeLabels = {}; story.treeLabels[id] = v; scheduleSave(); renderNodeList(); refreshCanvas(); }));
  s1.appendChild(makeTextareaRow('叙述文本', node.text || '', v => { node.text = v; scheduleSave(); refreshCanvas(); }));
  form.appendChild(s1);

  // Scene & video
  const s2 = makeSection('场景与视频');
  s2.appendChild(makeSelectRow('场景背景', SCENES.map(s => ({ val: s, text: SCENE_NAMES[s] || s })), node.scene || '', v => { node.scene = v; scheduleSave(); }));
  s2.appendChild(makeTextRow('视频URL', node.videoUrl || '', v => { if (v) node.videoUrl = v; else delete node.videoUrl; scheduleSave(); refreshCanvas(); }, 'input', 'url'));
  const fileRow = el('div', { cls: 'form-row' });
  fileRow.appendChild(el('label', { text: '本地视频' }));
  const fileInput = el('input', { type: 'file', accept: 'video/*' });
  fileInput.onchange = function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

      // 警告：大于5MB的视频可能导致localStorage存储失败
      if (file.size > 5 * 1024 * 1024) {
        const proceed = confirm(`视频文件大小为 ${fileSizeMB}MB，较大的视频可能无法保存到本地存储。\n\n建议：\n1. 使用在线视频URL（上方"视频URL"字段）\n2. 或压缩视频后再上传\n\n是否继续？`);
        if (!proceed) {
          this.value = '';
          return;
        }
      }

      // 使用FileReader转换为Data URL以便跨页面使用
      const reader = new FileReader();
      reader.onload = function(e) {
        node.videoUrl = e.target.result; // Data URL格式
        scheduleSave();
        renderRightPanel(id);
        refreshCanvas();
        showToast(`视频已加载 (${fileSizeMB}MB)`);
      };
      reader.onerror = function() {
        showToast('视频加载失败');
      };
      reader.readAsDataURL(file);
    }
  };
  fileRow.appendChild(fileInput);
  s2.appendChild(fileRow);
  // 添加提示信息
  const hint = el('div', { cls: 'form-row', style: { fontSize: '10px', color: 'var(--text-dim)', marginTop: '0', paddingTop: '0' } });
  hint.textContent = '💡 提示：小视频(<5MB)可直接上传，大视频建议使用在线URL';
  s2.appendChild(hint);
  if (node.videoUrl) { const vp = el('div', { cls: 'video-preview' }); const vid = el('video', { src: node.videoUrl, controls: '', muted: '' }); vid.style.width = '100%'; vp.appendChild(vid); s2.appendChild(vp); }
  form.appendChild(s2);

  // Ending
  const s3 = makeSection('结局设置');
  s3.appendChild(makeSelectRow('是否结局', [{ val: 'false', text: '否' }, { val: 'true', text: '是' }], String(!!node.ending), v => { node.ending = v === 'true'; scheduleSave(); refreshCanvas(); renderNodeList(); }));
  const etypes = [{ val: '', text: '(无)' }, { val: 'warm', text: '温馨' }, { val: 'touching', text: '感人' }, { val: 'happy', text: '快乐' }, { val: 'funny', text: '有趣' }, { val: 'chill', text: '佛系' }];
  s3.appendChild(makeSelectRow('结局类型', etypes, node.endingType || '', v => { if (v) node.endingType = v; else delete node.endingType; scheduleSave(); }));
  form.appendChild(s3);

  // Overlays
  const s4 = makeSection('浮层');
  const ovContainer = el('div', { id: 'overlays-editor' });
  s4.appendChild(ovContainer);
  renderOverlaysEditor(id, ovContainer);
  s4.appendChild(el('button', { cls: 'add-btn', text: '+ 添加浮层', onclick: () => { if (!node.overlays) node.overlays = []; node.overlays.push({ type: 'label', text: '', x: '10%', y: '10%', delay: 0 }); scheduleSave(); renderOverlaysEditor(id, ovContainer); } }));
  form.appendChild(s4);

  // Choices
  const s5 = makeSection('选项');
  s5.appendChild(makeNumRow('倒计时（秒）', node.timer || 10, 1, 60, v => { node.timer = v; scheduleSave(); }));
  s5.appendChild(makeNumRow('默认选项序号', node.defaultChoice || 0, 0, 10, v => { node.defaultChoice = v; scheduleSave(); }));
  const chContainer = el('div', { id: 'choices-editor' });
  s5.appendChild(chContainer);
  renderChoicesEditor(id, chContainer, allIds);
  s5.appendChild(el('button', { cls: 'add-btn', text: '+ 添加选项', onclick: () => { if (!node.choices) node.choices = []; node.choices.push({ text: '新选项', next: '', effects: {} }); scheduleSave(); renderRightPanel(id); refreshCanvas(); } }));
  form.appendChild(s5);

  // Delete
  const s6 = makeSection('');
  s6.appendChild(el('button', { cls: 'delete-node-btn', text: '删除此节点', onclick: () => deleteNode(id) }));
  form.appendChild(s6);
}

// ─── Form helpers ───
function makeSection(title) {
  const s = el('div', { cls: 'form-section' });
  if (title) s.appendChild(el('div', { cls: 'form-section-title', text: title }));
  return s;
}
function makeTextRow(label, value, onChange, evt, type) {
  const row = el('div', { cls: 'form-row' });
  row.appendChild(el('label', { text: label }));
  const inp = el('input', { type: type || 'text', value: value });
  inp.addEventListener(evt || 'input', () => onChange(inp.value));
  row.appendChild(inp);
  return row;
}
function makeTextareaRow(label, value, onChange) {
  const row = el('div', { cls: 'form-row' });
  row.appendChild(el('label', { text: label }));
  const ta = el('textarea'); ta.value = value;
  ta.addEventListener('input', () => onChange(ta.value));
  row.appendChild(ta);
  return row;
}
function makeSelectRow(label, options, value, onChange) {
  const row = el('div', { cls: 'form-row' });
  row.appendChild(el('label', { text: label }));
  const s = el('select');
  options.forEach(o => { const opt = el('option', { value: o.val, text: o.text }); if (o.val === value) opt.selected = true; s.appendChild(opt); });
  s.addEventListener('change', () => onChange(s.value));
  row.appendChild(s);
  return row;
}
function makeNumRow(label, value, min, max, onChange) {
  const row = el('div', { cls: 'form-row' });
  row.appendChild(el('label', { text: label }));
  const inp = el('input', { type: 'number', value: String(value), min: String(min), max: String(max) });
  inp.addEventListener('change', () => onChange(+inp.value));
  row.appendChild(inp);
  return row;
}

function renderOverlaysEditor(id, container) {
  container.textContent = '';
  const node = story.nodes[id], overlays = node.overlays || [];
  overlays.forEach((ov, i) => {
    const item = el('div', { cls: 'overlay-editor-item' });
    const typeSel = el('select', { cls: 'ov-select' });
    ['label', 'warning', 'data'].forEach(t => { const o = el('option', { value: t, text: t === 'label' ? '标签' : t === 'warning' ? '警告' : '数据' }); if (ov.type === t) o.selected = true; typeSel.appendChild(o); });
    typeSel.onchange = () => { ov.type = typeSel.value; scheduleSave(); };
    item.appendChild(typeSel);
    const txtInp = el('input', { cls: 'ov-input ov-text', value: ov.text || '', placeholder: '文本' }); txtInp.oninput = () => { ov.text = txtInp.value; scheduleSave(); }; item.appendChild(txtInp);
    const xInp = el('input', { cls: 'ov-input ov-pos', value: ov.x || '10%', placeholder: 'x' }); xInp.oninput = () => { ov.x = xInp.value; scheduleSave(); }; item.appendChild(xInp);
    const yInp = el('input', { cls: 'ov-input ov-pos', value: ov.y || '10%', placeholder: 'y' }); yInp.oninput = () => { ov.y = yInp.value; scheduleSave(); }; item.appendChild(yInp);
    const dInp = el('input', { cls: 'ov-input ov-delay', type: 'number', value: String(ov.delay || 0), step: '0.5', min: '0' }); dInp.oninput = () => { ov.delay = +dInp.value; scheduleSave(); }; item.appendChild(dInp);
    item.appendChild(el('button', { cls: 'ov-delete', text: '×', onclick: () => { overlays.splice(i, 1); scheduleSave(); renderOverlaysEditor(id, container); } }));
    container.appendChild(item);
  });
}

function renderChoicesEditor(id, container, allIds) {
  container.textContent = '';
  const node = story.nodes[id], choices = node.choices || [];
  choices.forEach((ch, i) => {
    const item = el('div', { cls: 'choice-editor-item' });
    const hdr = el('div', { cls: 'choice-header' });
    hdr.appendChild(el('span', { cls: 'choice-num', text: String(i + 1) }));
    hdr.appendChild(el('span', { text: '选项', style: { fontSize: '11px', color: 'var(--text-dim)' } }));
    hdr.appendChild(el('button', { cls: 'choice-delete', text: '×', onclick: () => { choices.splice(i, 1); scheduleSave(); renderRightPanel(id); refreshCanvas(); } }));
    item.appendChild(hdr);
    const txtInp = el('input', { cls: 'ce-input', value: ch.text || '', placeholder: '选项文本' }); txtInp.oninput = () => { ch.text = txtInp.value; scheduleSave(); }; item.appendChild(txtInp);
    const nextSel = el('select', { cls: 'ce-select' });
    nextSel.appendChild(el('option', { value: '', text: '(未连接)' }));
    allIds.forEach(nid => { const o = el('option', { value: nid, text: (story.treeLabels && story.treeLabels[nid]) || nid }); if (ch.next === nid) o.selected = true; nextSel.appendChild(o); });
    nextSel.onchange = () => { ch.next = nextSel.value; scheduleSave(); refreshCanvas(); };
    item.appendChild(nextSel);
    item.appendChild(el('div', { text: '效果', style: { fontSize: '10px', color: 'var(--text-dim)', margin: '4px 0 2px' } }));
    const efRow = el('div', { cls: 'choice-effects-row' });
    ['energy', 'mood', 'fullness'].forEach(k => {
      const lbl = el('label', { text: k === 'energy' ? '体力' : k === 'mood' ? '心情' : '饱腹' });
      const inp = el('input', { type: 'number', value: String((ch.effects && ch.effects[k]) || 0) });
      inp.onchange = () => { if (!ch.effects) ch.effects = {}; const v = +inp.value; if (v === 0) delete ch.effects[k]; else ch.effects[k] = v; scheduleSave(); };
      lbl.appendChild(inp); efRow.appendChild(lbl);
    });
    item.appendChild(efRow);
    item.appendChild(el('div', { text: '条件（最低值）', style: { fontSize: '10px', color: 'var(--text-dim)', margin: '4px 0 2px' } }));
    const rqRow = el('div', { cls: 'choice-requires-row' });
    ['energy', 'mood', 'fullness'].forEach(k => {
      const lbl = el('label', { text: k === 'energy' ? '体力' : k === 'mood' ? '心情' : '饱腹' });
      const inp = el('input', { type: 'number', value: String((ch.requires && ch.requires[k]) || 0), min: '0' });
      inp.onchange = () => { if (!ch.requires) ch.requires = {}; const v = +inp.value; if (v === 0) delete ch.requires[k]; else ch.requires[k] = v; if (ch.requires && !Object.keys(ch.requires).length) delete ch.requires; scheduleSave(); };
      lbl.appendChild(inp); rqRow.appendChild(lbl);
    });
    item.appendChild(rqRow);
    container.appendChild(item);
  });
}

// ─── Node operations ───
function addNode() {
  let i = 1; while (story.nodes['new_node_' + i]) i++;
  const id = 'new_node_' + i;
  story.nodes[id] = { scene: 'bg-bedroom', title: '新节点', text: '', overlays: [], choices: [], defaultChoice: 0, timer: 10 };
  if (!story.treeLabels) story.treeLabels = {};
  story.treeLabels[id] = '新节点';
  if (!story.treeOrder) story.treeOrder = [];
  story.treeOrder.push(id);
  // Place near center of current view
  if (!story._canvasPositions) story._canvasPositions = {};
  const center = lf ? lf.getPointByClient(window.innerWidth / 2, window.innerHeight / 2) : { x: 400, y: 300 };
  story._canvasPositions[id] = { x: center.x || 400, y: center.y || 300 };
  scheduleSave();
  refreshCanvas();
  renderNodeList();
  renderSettings();
  selectNode(id);
  showToast('已添加节点: ' + id);
}

function deleteNode(id) {
  if (!story.nodes[id] || !confirm('确定要删除节点 "' + id + '" 吗？')) return;
  delete story.nodes[id];
  if (story._canvasPositions) delete story._canvasPositions[id];
  if (story.treeLabels) delete story.treeLabels[id];
  if (story.treeOrder) story.treeOrder = story.treeOrder.filter(x => x !== id);
  Object.values(story.nodes).forEach(n => { if (n.choices) n.choices.forEach(ch => { if (ch.next === id) ch.next = ''; }); });
  if (story.startNode === id) { const ids = Object.keys(story.nodes); story.startNode = ids[0] || ''; }
  if (selectedNode === id) selectedNode = null;
  scheduleSave();
  refreshCanvas();
  renderNodeList();
  renderSettings();
  renderRightPanel(selectedNode);
  showToast('已删除节点: ' + id);
}

function renameNode(oldId, newId) {
  newId = newId.trim().replace(/\s+/g, '_');
  if (!newId || newId === oldId) return;
  if (story.nodes[newId]) { showToast('ID 已存在'); return; }
  story.nodes[newId] = story.nodes[oldId]; delete story.nodes[oldId];
  if (story._canvasPositions && story._canvasPositions[oldId]) { story._canvasPositions[newId] = story._canvasPositions[oldId]; delete story._canvasPositions[oldId]; }
  if (story.treeLabels && story.treeLabels[oldId]) { story.treeLabels[newId] = story.treeLabels[oldId]; delete story.treeLabels[oldId]; }
  if (story.treeOrder) story.treeOrder = story.treeOrder.map(x => x === oldId ? newId : x);
  if (story.startNode === oldId) story.startNode = newId;
  Object.values(story.nodes).forEach(n => { if (n.choices) n.choices.forEach(ch => { if (ch.next === oldId) ch.next = newId; }); });
  if (selectedNode === oldId) selectedNode = newId;
  scheduleSave();
  refreshCanvas();
  renderNodeList();
  renderSettings();
  renderRightPanel(newId);
  showToast('节点已重命名');
}

// ─── Save / Export / Import ───
function scheduleSave() { if (saveTimeout) clearTimeout(saveTimeout); saveTimeout = setTimeout(doSave, 800); }
function doSave() {
  syncPositionsFromLf();
  story.name = sel('#toolbar-story-name').value || story.name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
}
function saveStory() { doSave(); showToast('已保存到本地存储'); }
function exportJSON() {
  doSave();
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (story.name || 'story') + '.json'; a.click(); URL.revokeObjectURL(a.href);
  showToast('已导出 JSON');
}
function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.nodes || !data.startNode) { showToast('无效的故事文件'); return; }
      story = data; selectedNode = null;
      refreshCanvas();
      renderSidePanels();
      renderRightPanel(null);
      scheduleSave();
      setTimeout(() => lf.fitView(80), 100);
      showToast('导入成功');
    } catch (err) { showToast('解析失败: ' + err.message); }
  };
  reader.readAsText(file); e.target.value = '';
}
function newStory() {
  if (!confirm('新建故事将清除当前数据，继续吗？')) return;
  story = { name: '新故事', startNode: 'start', variables: { energy: 80, mood: 70, fullness: 40 }, nodes: { start: { scene: 'bg-bedroom', title: '开始', text: '故事从这里开始……', overlays: [], choices: [], defaultChoice: 0, timer: 10 } }, treeOrder: ['start'], treeLabels: { start: '开始' } };
  selectedNode = null;
  refreshCanvas();
  renderSidePanels();
  renderRightPanel(null);
  scheduleSave();
  showToast('已创建新故事');
}
function previewPlay() { doSave(); window.open('index.html'); }
function clearCache() {
  if (!confirm('清除缓存将删除浏览器中保存的所有故事数据。\n\n建议先导出当前故事，确认继续？')) return;
  localStorage.clear();
  showToast('缓存已清除，即将刷新页面...');
  setTimeout(() => window.location.reload(), 1500);
}

// ─── Toast ───
function showToast(msg) { const t = sel('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }

// ─── Example templates (all subsets of 橘子的一天) ───
const EXAMPLES = [
  { id: 'minimal', icon: '🍽️', name: '晚饭抉择', desc: '最简分支：1个起点 → 2个结局', nodes: 3, edges: 2 },
  { id: 'evening', icon: '🌆', name: '傍晚等主人', desc: '多级分支+路径汇聚+3个结局', nodes: 6, edges: 6 },
  { id: 'morning', icon: '🌅', name: '橘子的早晨', desc: '三岔路+汇聚+浮层+变量效果', nodes: 7, edges: 8 },
  { id: 'cat', icon: '🐱', name: '橘子的一天（完整）', desc: '28节点完整故事，全部功能', nodes: 28, edges: 42 },
];

function getExampleStory(id) {
  // Full story
  if (id === 'cat') return getDefaultStory();

  // Subset: evening_meal → 2 endings (minimal branching)
  if (id === 'minimal') {
    const full = getDefaultStory();
    return {
      "name": "晚饭抉择（最小示例）", "startNode": "evening_meal",
      "variables": { "energy": 50, "mood": 60, "fullness": 30 },
      "nodes": {
        "evening_meal": full.nodes.evening_meal,
        "ending_excited_reunion": full.nodes.ending_excited_reunion,
        "ending_cool_cat": full.nodes.ending_cool_cat
      },
      "treeOrder": ["evening_meal", "ending_excited_reunion", "ending_cool_cat"],
      "treeLabels": { "evening_meal": "晚饭时间", "ending_excited_reunion": "* 最热烈欢迎", "ending_cool_cat": "* 高冷猫设" }
    };
  }

  // Subset: evening_wake → wait_at_door / evening_meal → 3 endings
  if (id === 'evening') {
    const full = getDefaultStory();
    // Trim evening_wake: keep only wait_at_door + evening_meal choices
    const ew = JSON.parse(JSON.stringify(full.nodes.evening_wake));
    ew.choices = ew.choices.filter(c => c.next === 'wait_at_door' || c.next === 'evening_meal');
    return {
      "name": "傍晚等主人", "startNode": "evening_wake",
      "variables": { "energy": 60, "mood": 65, "fullness": 35 },
      "nodes": {
        "evening_wake": ew,
        "wait_at_door": full.nodes.wait_at_door,
        "evening_meal": full.nodes.evening_meal,
        "ending_loyal_wait": full.nodes.ending_loyal_wait,
        "ending_excited_reunion": full.nodes.ending_excited_reunion,
        "ending_cool_cat": full.nodes.ending_cool_cat
      },
      "treeOrder": ["evening_wake", "wait_at_door", "evening_meal", "ending_loyal_wait", "ending_excited_reunion", "ending_cool_cat"],
      "treeLabels": { "evening_wake": "傍晚醒来", "wait_at_door": "门口守候", "evening_meal": "晚饭时间", "ending_loyal_wait": "* 忠诚守候", "ending_excited_reunion": "* 最热烈欢迎", "ending_cool_cat": "* 高冷猫设" }
    };
  }

  // Subset: morning_wake → 3 branches → converge at windowsill → windowsill_nap (ending)
  if (id === 'morning') {
    const full = getDefaultStory();
    // morning_wake: keep all 3 choices (check_food, windowsill, sleep_more)
    const mw = JSON.parse(JSON.stringify(full.nodes.morning_wake));
    // check_food: keep only meow_for_food
    const cf = JSON.parse(JSON.stringify(full.nodes.check_food));
    cf.choices = [cf.choices[0]]; // only "对着喂食器喵喵大叫" → meow_for_food
    // meow_for_food: keep only windowsill
    const mf = JSON.parse(JSON.stringify(full.nodes.meow_for_food));
    mf.choices = [mf.choices[1]]; // only "吃完跳上窗台看风景" → windowsill
    // sleep_more: both choices go to breakfast_time, keep as-is
    const sm = JSON.parse(JSON.stringify(full.nodes.sleep_more));
    // breakfast_time: keep only windowsill choice
    const bt = JSON.parse(JSON.stringify(full.nodes.breakfast_time));
    bt.choices = [bt.choices[2]]; // only "去窗台消消食" → windowsill
    // windowsill: keep only windowsill_nap
    const ws = JSON.parse(JSON.stringify(full.nodes.windowsill));
    ws.choices = [ws.choices[1]]; // only "趴下来安静地晒太阳" → windowsill_nap
    // windowsill_nap: mark as ending in this subset
    const wn = JSON.parse(JSON.stringify(full.nodes.windowsill_nap));
    wn.ending = true; wn.endingType = "warm"; wn.choices = [];

    return {
      "name": "橘子的早晨", "startNode": "morning_wake",
      "variables": { "energy": 80, "mood": 70, "fullness": 40 },
      "nodes": {
        "morning_wake": mw, "check_food": cf, "meow_for_food": mf,
        "sleep_more": sm, "breakfast_time": bt, "windowsill": ws, "windowsill_nap": wn
      },
      "treeOrder": ["morning_wake", "check_food", "meow_for_food", "sleep_more", "breakfast_time", "windowsill", "windowsill_nap"],
      "treeLabels": { "morning_wake": "清晨起床", "check_food": "查看食盆", "meow_for_food": "喵喵要饭", "sleep_more": "继续赖床", "breakfast_time": "早餐时间", "windowsill": "窗台观鸟", "windowsill_nap": "* 窗台阳光浴" }
    };
  }

  return null;
}

// ─── Default story data ───
function getDefaultStory(){return {"name":"橘子的一天","startNode":"morning_wake","variables":{"energy":80,"mood":70,"fullness":40},"nodes":{"morning_wake":{"scene":"bg-bedroom","title":"清晨 7:00 · 卧室","text":"一缕阳光从窗帘缝里溜进来，正好照在橘子的肚皮上。橘子眯着眼翻了个身，橘色的毛在晨光里暖烘烘的。\n\n肚子咕噜叫了一声。主人昨晚出门前留了猫粮，但不知道还剩多少。窗台上好像有只鸟在叫。\n\n新的一天开始了，橘子打了个大大的哈欠。","overlays":[{"type":"label","text":"早安，橘子","x":"5%","y":"8%","delay":1},{"type":"data","text":"07:02 AM | 晴","x":"70%","y":"8%","delay":2}],"choices":[{"text":"伸个懒腰，去厨房找吃的","next":"check_food","effects":{"energy":-5}},{"text":"跳上窗台看看外面的世界","next":"windowsill","effects":{"mood":10}},{"text":"太早了……翻个身继续睡","next":"sleep_more","effects":{"energy":20}}],"defaultChoice":0,"timer":10},"check_food":{"scene":"bg-kitchen","title":"上午 7:15 · 厨房","text":"橘子踩着小碎步来到厨房，爪子踩在冰凉的地砖上缩了一下。走到食盆前低头一看——里面只剩几颗猫粮碎渣。","overlays":[{"type":"warning","text":"食盆：几乎见底","x":"5%","y":"12%","delay":1},{"type":"data","text":"自动喂食器：08:00 出粮","x":"55%","y":"8%","delay":2}],"choices":[{"text":"对着喂食器喵喵大叫","next":"meow_for_food","effects":{"energy":-10,"mood":-5}},{"text":"先喝口水，等等再说","next":"drink_water","effects":{"fullness":10}},{"text":"算了，去客厅找点乐子","next":"explore_livingroom","effects":{"mood":5}}],"defaultChoice":1,"timer":10},"meow_for_food":{"scene":"bg-kitchen","title":"上午 7:20 · 厨房","text":"「喵——！喵喵——！！」橘子扯开嗓子对着喂食器嚎了起来。喂食器毫无反应。不过坚持了三分钟后——哐当！吐出了一小撮猫粮。","overlays":[{"type":"label","text":"坚持就是胜利","x":"5%","y":"8%","delay":1},{"type":"data","text":"已获得：少量猫粮","x":"60%","y":"80%","delay":2}],"choices":[{"text":"吃完去客厅溜达","next":"explore_livingroom","effects":{"fullness":25,"mood":10}},{"text":"吃完跳上窗台看风景","next":"windowsill","effects":{"fullness":25}}],"defaultChoice":0,"timer":10},"drink_water":{"scene":"bg-kitchen","title":"上午 7:18 · 厨房水碗旁","text":"橘子低头喝水，小舌头快速地卷起水花。喝完水整个猫都精神了不少。","overlays":[{"type":"data","text":"补充水分 +10","x":"5%","y":"80%","delay":1}],"choices":[{"text":"去客厅跑酷！","next":"parkour","effects":{"mood":15,"energy":-15},"requires":{"energy":50}},{"text":"去窗台看看外面怎么样","next":"windowsill","effects":{"mood":5}},{"text":"回卧室再趴一会儿","next":"morning_nap","effects":{"energy":15}}],"defaultChoice":0,"timer":10},"sleep_more":{"scene":"bg-bedroom","title":"上午 8:30 · 卧室","text":"橘子蜷成一个完美的橘色甜甜圈。梦里变成了大老虎。客厅传来喂食器出粮的声响。","overlays":[{"type":"label","text":"zzZZZ...","x":"60%","y":"20%","delay":1},{"type":"data","text":"体力已恢复","x":"5%","y":"80%","delay":3}],"choices":[{"text":"弹射起步！冲向食盆！","next":"breakfast_time","effects":{"energy":-10}},{"text":"慢悠悠地伸个懒腰再去","next":"breakfast_time","effects":{"mood":5}}],"defaultChoice":0,"timer":10},"windowsill":{"scene":"bg-windowsill","title":"上午 · 窗台","text":"橘子轻巧地跳上窗台，外面的世界热闹极了。橘子瞳孔放大，屁股开始左右摇摆。","overlays":[{"type":"label","text":"观鸟模式","x":"5%","y":"8%","delay":1},{"type":"data","text":"目标锁定：麻雀 x1","x":"60%","y":"30%","delay":2},{"type":"warning","text":"瞳孔：已放大","x":"60%","y":"80%","delay":2.5}],"choices":[{"text":"扑上去！用爪子拍玻璃！","next":"paw_glass","effects":{"mood":10,"energy":-10}},{"text":"趴下来安静地晒太阳","next":"windowsill_nap","effects":{"energy":10,"mood":10}},{"text":"不看了，去客厅找玩具","next":"explore_livingroom","effects":{"mood":5}}],"defaultChoice":0,"timer":10},"paw_glass":{"scene":"bg-windowsill","title":"上午 · 窗台","text":"橘子的爪子疯狂地拍打着玻璃窗。麻雀根本不怕。窗户真是世界上最残忍的发明。","overlays":[{"type":"warning","text":"玻璃：纹丝不动","x":"50%","y":"30%","delay":1},{"type":"data","text":"兴奋度：MAX","x":"5%","y":"80%","delay":2}],"choices":[{"text":"化悲愤为力量——跑酷！","next":"parkour","effects":{"energy":-10,"mood":5},"requires":{"energy":40}},{"text":"去厨房找点吃的安慰自己","next":"check_food","effects":{}}],"defaultChoice":0,"timer":10},"windowsill_nap":{"scene":"bg-sunbeam","title":"上午 · 窗台阳光浴","text":"橘子肚皮朝上展开，阳光暖洋洋的。呼噜声从喉咙深处响起。猫生的终极享受。","overlays":[{"type":"label","text":"呼噜呼噜...","x":"5%","y":"8%","delay":1},{"type":"data","text":"舒适度：100%","x":"60%","y":"80%","delay":2}],"choices":[{"text":"就这么睡到中午吧","next":"afternoon","effects":{"energy":25,"mood":15}},{"text":"睡了一会儿醒了，去探索","next":"explore_livingroom","effects":{"energy":15,"mood":10}}],"defaultChoice":0,"timer":10},"morning_nap":{"scene":"bg-bedroom","title":"上午 · 卧室猫窝","text":"橘子回到猫窝，转了三圈后卧下。打了几个小呼噜后又醒了。","overlays":[{"type":"data","text":"小憩完毕","x":"5%","y":"80%","delay":1}],"choices":[{"text":"去厨房看看喂食器出粮了没","next":"breakfast_time","effects":{}},{"text":"去客厅找东西玩","next":"explore_livingroom","effects":{"mood":5}}],"defaultChoice":0,"timer":10},"breakfast_time":{"scene":"bg-kitchen","title":"上午 8:00 · 早餐时间","text":"哐当！自动喂食器准时出粮了！橘子冲到食盆前埋头大吃。吃饱喝足，精力充沛。","overlays":[{"type":"label","text":"开饭啦！","x":"5%","y":"8%","delay":0.5},{"type":"data","text":"饱腹感 UP!","x":"60%","y":"80%","delay":2}],"choices":[{"text":"吃饱了就想运动——跑酷时间！","next":"parkour","effects":{"fullness":35,"energy":-5,"mood":10},"requires":{"energy":40}},{"text":"吃完犯困，找个地方打盹","next":"afternoon","effects":{"fullness":35,"mood":5}},{"text":"去窗台消消食","next":"windowsill","effects":{"fullness":35,"mood":5}}],"defaultChoice":0,"timer":10},"explore_livingroom":{"scene":"bg-livingroom","title":"客厅探险","text":"客厅是橘子的主战场。茶几上有笔，沙发底下有小球，猫爬架上有猫薄荷玩具。","overlays":[{"type":"label","text":"探索模式","x":"5%","y":"8%","delay":1},{"type":"data","text":"可互动物品：已扫描","x":"55%","y":"8%","delay":2}],"choices":[{"text":"跳上茶几，把那支笔推下去","next":"knock_stuff","effects":{"mood":20,"energy":-5}},{"text":"爬上猫爬架拿猫薄荷玩具","next":"catnip_play","effects":{"energy":-10,"mood":15},"requires":{"energy":40}},{"text":"钻到沙发底下找小球","next":"under_sofa","effects":{"energy":-10,"mood":10}}],"defaultChoice":0,"timer":10},"knock_stuff":{"scene":"bg-livingroom","title":"客厅 · 茶几","text":"橘子优雅地跳上茶几，轻轻一推——啪嗒。笔掉到了地上。","overlays":[{"type":"label","text":"啪嗒！","x":"40%","y":"40%","delay":1},{"type":"data","text":"已推落物品 x1","x":"5%","y":"80%","delay":2}],"choices":[{"text":"继续推！把遥控器也推下去","next":"knock_more","effects":{"mood":15,"energy":-5}},{"text":"满意了，去跑酷","next":"parkour","effects":{"mood":5},"requires":{"energy":40}},{"text":"无聊了，去找吃的","next":"afternoon_snack","effects":{}}],"defaultChoice":0,"timer":10},"knock_more":{"scene":"bg-livingroom","title":"客厅 · 疯狂推落","text":"遥控器、杯垫、便签纸纷纷落地。橘子坐在茶几中央环顾杰作，满意。","overlays":[{"type":"warning","text":"破坏指数：MAX","x":"50%","y":"20%","delay":1},{"type":"data","text":"推落物品 x4","x":"5%","y":"80%","delay":2}],"choices":[{"text":"心满意足，找个地方休息","next":"afternoon","effects":{"mood":10,"energy":-5}},{"text":"还有体力！去跑酷！","next":"parkour","effects":{},"requires":{"energy":50}}],"defaultChoice":0,"timer":10},"under_sofa":{"scene":"bg-livingroom","title":"客厅 · 沙发底下","text":"橘子像液体一样流进沙发底下。发现了小球、橡皮筋等宝藏。钻出来沾满了灰。","overlays":[{"type":"label","text":"沙发探险","x":"5%","y":"8%","delay":1},{"type":"data","text":"发现物品 x5","x":"60%","y":"80%","delay":2}],"choices":[{"text":"舔毛！必须把自己清理干净","next":"grooming","effects":{"mood":5}},{"text":"灰就灰吧，去找别的玩","next":"parkour","effects":{"mood":5},"requires":{"energy":40}}],"defaultChoice":0,"timer":10},"catnip_play":{"scene":"bg-livingroom","title":"猫爬架 · 猫薄荷时间","text":"橘子扑住猫薄荷老鼠玩具，瞳孔放到最大。十分钟后瘫倒在猫爬架上，爽……","overlays":[{"type":"warning","text":"猫薄荷效果：已触发","x":"50%","y":"15%","delay":1},{"type":"label","text":"嗨翻了！","x":"5%","y":"8%","delay":1.5},{"type":"data","text":"理智：暂时离线","x":"60%","y":"80%","delay":2.5}],"choices":[{"text":"瘫着不动了，直接睡过去","next":"afternoon","effects":{"mood":20,"energy":-20}},{"text":"嗨完之后好饿，去找吃的","next":"afternoon_snack","effects":{"mood":15,"energy":-15}}],"defaultChoice":0,"timer":10},"parkour":{"scene":"bg-livingroom","title":"跑酷时间！","text":"跑酷模式启动！沙发→椅子→茶几→猫爬架→书架→空翻落地！太爽了。","overlays":[{"type":"label","text":"疾速模式","x":"5%","y":"8%","delay":0.5},{"type":"data","text":"速度：极速","x":"60%","y":"15%","delay":1},{"type":"warning","text":"家具完整性：-15%","x":"55%","y":"80%","delay":2}],"choices":[{"text":"跑累了，该补充能量了","next":"afternoon_snack","effects":{"energy":-20,"mood":20}},{"text":"还不够！继续推东西","next":"knock_stuff","effects":{"energy":-15,"mood":15}},{"text":"累瘫了，就地休息","next":"afternoon","effects":{"energy":-20,"mood":15}}],"defaultChoice":0,"timer":10},"grooming":{"scene":"bg-sunbeam","title":"下午 · 梳毛时间","text":"橘子开始每日必修课——舔毛。二十分钟后毛发从灰扑扑变回亮橘色。","overlays":[{"type":"label","text":"梳毛中...","x":"5%","y":"8%","delay":1},{"type":"data","text":"毛发光泽度：恢复中","x":"55%","y":"80%","delay":2}],"choices":[{"text":"打理完毕，找个地方午睡","next":"afternoon","effects":{"mood":10,"energy":-5}},{"text":"顺便去喝口水","next":"afternoon_snack","effects":{"mood":10}}],"defaultChoice":0,"timer":10},"afternoon_snack":{"scene":"bg-kitchen","title":"下午 · 加餐时间","text":"橘子吃了些猫粮又喝了几口水。下午的阳光正好。","overlays":[{"type":"data","text":"饱腹感 UP!","x":"5%","y":"80%","delay":1}],"choices":[{"text":"找个阳光最好的位置午睡","next":"afternoon","effects":{"fullness":20,"mood":5}},{"text":"精力还不错，去窗台看风景","next":"windowsill","effects":{"fullness":20}}],"defaultChoice":0,"timer":10},"afternoon":{"scene":"bg-sunbeam","title":"下午 2:00 · 阳光午睡","text":"橘子找到最大的一块阳光，踩奶后卧下。呼噜声像一台小发动机。","overlays":[{"type":"label","text":"呼噜噜...","x":"5%","y":"8%","delay":1},{"type":"data","text":"幸福指数：爆表","x":"55%","y":"12%","delay":2},{"type":"data","text":"呼噜分贝：42dB","x":"55%","y":"80%","delay":3}],"choices":[{"text":"继续睡到傍晚","next":"evening_wake","effects":{"energy":30,"mood":10}},{"text":"醒来去窗台看看","next":"evening_window","effects":{"energy":20,"mood":5}},{"text":"醒来去门口蹲着","next":"wait_at_door","effects":{"energy":20,"mood":5},"requires":{"mood":60}}],"defaultChoice":0,"timer":10},"evening_wake":{"scene":"bg-door","title":"傍晚 5:30","text":"橘子睡了超级长的午觉，屋里已经暗下来了。主人应该快回来了吧？","overlays":[{"type":"data","text":"17:32 PM","x":"70%","y":"8%","delay":1},{"type":"label","text":"主人什么时候回来？","x":"5%","y":"8%","delay":2}],"choices":[{"text":"去门口蹲着等主人","next":"wait_at_door","effects":{"mood":10}},{"text":"先去窗户看看主人来了没","next":"evening_window","effects":{"mood":5}},{"text":"管他呢，先吃饭","next":"evening_meal","effects":{"fullness":20}}],"defaultChoice":0,"timer":10},"evening_window":{"scene":"bg-windowsill","title":"傍晚 · 窗前等待","text":"橘子趴在窗沿上往外看。每当有人走近楼门口，耳朵就竖起来。然后——不是主人。","overlays":[{"type":"label","text":"等待中...","x":"5%","y":"8%","delay":1},{"type":"data","text":"已等待：10分钟","x":"60%","y":"80%","delay":2}],"choices":[{"text":"继续等，主人一定会回来的","next":"ending_window_reunion","effects":{"mood":-5},"requires":{"mood":50}},{"text":"不等了，去门口守着","next":"wait_at_door","effects":{}},{"text":"不等了，自己找乐子","next":"ending_independent","effects":{"mood":-10}}],"defaultChoice":0,"timer":10},"wait_at_door":{"scene":"bg-door","title":"傍晚 · 门口守候","text":"橘子坐在玄关地垫上面对大门，姿势端正像一尊橘色小狮子。","overlays":[{"type":"label","text":"忠诚守候","x":"5%","y":"8%","delay":1},{"type":"data","text":"门口蹲守中...","x":"60%","y":"80%","delay":2}],"choices":[{"text":"坚持等！不管多久都等！","next":"ending_loyal_wait","effects":{}},{"text":"先去吃口东西再回来等","next":"evening_meal","effects":{"fullness":15}}],"defaultChoice":0,"timer":10},"evening_meal":{"scene":"bg-kitchen","title":"傍晚 · 晚饭","text":"橘子一边吃一边竖着耳朵听。突然！门口传来了钥匙转动的声音！","overlays":[{"type":"warning","text":"钥匙声！","x":"40%","y":"30%","delay":1},{"type":"label","text":"是主人！！","x":"5%","y":"8%","delay":2}],"choices":[{"text":"冲向门口迎接！","next":"ending_excited_reunion","effects":{"fullness":15,"mood":30}},{"text":"假装淡定，继续慢慢吃","next":"ending_cool_cat","effects":{"fullness":20,"mood":10}}],"defaultChoice":0,"timer":10},"ending_window_reunion":{"scene":"bg-ending","ending":true,"endingType":"warm","title":"结局：窗前重逢","text":"楼下出现了熟悉的身影。是主人！橘子一头扎进主人怀里。「我回来啦，小橘子。」今天是完美的一天。","overlays":[]},"ending_loyal_wait":{"scene":"bg-ending","ending":true,"endingType":"touching","title":"结局：忠诚的守候","text":"橘子在门口等了整整两个小时。门开了，主人心都化了。今晚橘子得到了双份猫条。","overlays":[]},"ending_excited_reunion":{"scene":"bg-ending","ending":true,"endingType":"happy","title":"结局：最热烈的欢迎","text":"橘子含着半嘴猫粮冲了出去！围着主人的脚疯狂转圈，翻过身来露出肚皮。这就是世界上最好的晚上。","overlays":[]},"ending_cool_cat":{"scene":"bg-ending","ending":true,"endingType":"funny","title":"结局：高冷猫设不能崩","text":"橘子头也不抬继续吃猫粮。半小时后「不经意地」靠在主人腿边「碰巧」打起了呼噜。才不是想你了呢。","overlays":[]},"ending_independent":{"scene":"bg-ending","ending":true,"endingType":"chill","title":"结局：独立猫猫的夜晚","text":"橘子决定不等了。自己吃了猫粮喝了水，跳上主人的床睡觉。主人回来后橘子自动滚过去靠着主人的脚。独立的猫也需要温暖的脚。","overlays":[]}},"treeOrder":["morning_wake","check_food","meow_for_food","drink_water","sleep_more","windowsill","paw_glass","windowsill_nap","morning_nap","breakfast_time","explore_livingroom","knock_stuff","knock_more","under_sofa","catnip_play","parkour","grooming","afternoon_snack","afternoon","evening_wake","evening_window","wait_at_door","evening_meal","ending_window_reunion","ending_loyal_wait","ending_excited_reunion","ending_cool_cat","ending_independent"],"treeLabels":{"morning_wake":"清晨起床","check_food":"查看食盆","meow_for_food":"喵喵要饭","drink_water":"喝水","sleep_more":"继续赖床","windowsill":"窗台观鸟","paw_glass":"拍窗户","windowsill_nap":"窗台打盹","morning_nap":"猫窝小憩","breakfast_time":"早餐时间","explore_livingroom":"探索客厅","knock_stuff":"推东西","knock_more":"疯狂推落","under_sofa":"沙发底探险","catnip_play":"猫薄荷嗨","parkour":"跑酷时间","grooming":"舔毛梳妆","afternoon_snack":"下午加餐","afternoon":"阳光午睡","evening_wake":"傍晚醒来","evening_window":"窗前等待","wait_at_door":"门口守候","evening_meal":"晚饭时间","ending_window_reunion":"* 窗前重逢","ending_loyal_wait":"* 忠诚守候","ending_excited_reunion":"* 最热烈欢迎","ending_cool_cat":"* 高冷猫设","ending_independent":"* 独立夜晚"}};}
