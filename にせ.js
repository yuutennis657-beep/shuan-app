/* 速さ第3段「1枚にする」の見本のにせサーバ（★本番には入らない。bash テスト/一枚の見本を見る.sh が見本の場所へ写す）
   ・google.script.run：画面の中身 は 中身.js の答えを、遅さを付けて返す。ほかは 見本の答え か {状態:'ok'}
   ・google.script.history：本物と同じ形（push・setChangeHandler）を pushState で
   ・右上の「見本の操作」：今までの形と比べる・初めて開く・あしたの朝に開く・押してから出るまでの秒 */
(function () {
  // ── 遅さ（本番の実測から）。★ここを変えて試せる
  var 遅さ = { 画面の中身: 250, ほか: 200 };
  var 朝 = sessionStorage.getItem('見本_朝') === '1';
  var 今日 = 朝 ? '20261009' : '20261008';

  function 答え(名, 引) {
    if (名 === '画面の中身') {
      var q = 引[0] || {};
      var k = (q.p || 'kyou') + '|' + (q.w || '') + '|' + (q.d || '');
      if (q.明日) k = 'kyou|||明日';
      if (朝 && k === 'kyou||') k = 'kyou||20261009';
      if (朝 && q.明日) return null;                          // 見本は1日ぶんだけ
      var r = window.見本の中身[k] || window.見本の中身[(q.p || 'kyou') + '||'];
      r = JSON.parse(JSON.stringify(r));
      if (朝) { r.今日 = 今日; if (!q.明日 && (q.p || 'kyou') === 'kyou' && !q.d) r.対象 = 今日; }
      return r;
    }
    if (window.見本の答え[名] !== undefined) return window.見本の答え[名];
    return { 状態: 'ok', ひとこと: '（見本）保存しました' };
  }
  function 走者() {
    var 済 = null, 困 = null, p;
    var o = {
      withSuccessHandler: function (f) { 済 = f; return p; },
      withFailureHandler: function (f) { 困 = f; return p; },
      withUserObject: function () { return p; }
    };
    p = new Proxy(o, {
      get: function (t, k) {
        if (k in t) return t[k];
        return function () {
          var 引 = [].slice.call(arguments), 名 = String(k);
          ログ('→ ' + 名 + (名 === '画面の中身' ? ' ' + JSON.stringify(引[0]) : ''));
          setTimeout(function () {
            var r = 答え(名, 引);
            ログ('← ' + 名);
            if (r === null) { if (困) 困(new Error('見本にはありません')); return; }
            if (済) 済(r);
          }, 名 === '画面の中身' ? 遅さ.画面の中身 : 遅さ.ほか);
        };
      }
    });
    return p;
  }
  var 見張り = null;
  window.google = { script: {} };
  Object.defineProperty(window.google.script, 'run', { configurable: true, enumerable: true, get: 走者 });
  window.google.script.history = {
    push: function (state, params) {
      var u = new URLSearchParams(params || {}).toString();
      history.pushState(state || null, '', '?' + u);
    },
    replace: function (state, params) { history.replaceState(state || null, '', '?' + new URLSearchParams(params || {}).toString()); },
    setChangeHandler: function (f) { 見張り = f; }
  };
  addEventListener('popstate', function (e) {
    if (!見張り) return;
    var o = {};
    new URLSearchParams(location.search).forEach(function (v, k) { o[k] = v; });
    見張り({ state: e.state, location: { parameter: o, parameters: {} } });
  });
  if (朝) { var 始 = null; Object.defineProperty(window, 'SHB一枚の始め', { configurable: true, get: function () { return 始; }, set: function (v) { v.今日 = 今日; 始 = v; } }); }

  // ── 押してから出るまで（下のタブ・リンクを押した時刻 → 画面の中身が入れかわった時刻）
  var 押した = 0, 出た表 = [], 開いて出た = 0, 最初の字 = '';
  addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a && !e.target.closest('#見本の操作')) 押した = performance.now();
  }, true);
  function 見張る() {
    new MutationObserver(function () {
      if (!開いて出た && document.querySelector('.hero,.shb-bar')) {
        開いて出た = performance.now();   // ★ページを開きはじめてから（サーバの待ちも入る）
        最初の字 = document.body.innerText.slice(0, 3000);
        書く();
      }
      if (!押した) return;
      var ms = performance.now() - 押した;
      押した = 0;
      出た表.unshift((ms / 1000).toFixed(2) + '秒');
      書く();
    }).observe(document.body, { childList: true });
  }

  // ── 見本の操作（<html> の直下に置く＝画面の入れかえで消えない）
  var ログ行 = [];
  function ログ(s) { ログ行.unshift(new Date().toTimeString().slice(3, 8) + ' ' + s); ログ行 = ログ行.slice(0, 6); 書く(); }
  var 板 = null;
  function 書く() {
    if (!板) return;
    板.querySelector('.t').textContent = (開いて出た ? '開いてから出るまで：' + (開いて出た / 1000).toFixed(2) + '秒\n' : '')
      + (出た表.length ? '押してから出るまで：' + 出た表.slice(0, 4).join('・') : '下のタブを押してみてください');
    板.querySelector('.l').textContent = ログ行.join('\n');
  }
  function 板を出す() {
    板 = null;
    var f = document.createElement('div');
    f.id = '見本の札';
    f.textContent = '見本：データはすべて架空・保存されません';
    f.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));z-index:99999;padding:4px 12px;border-radius:999px;background:#fffbe6;border:1.5px solid #c47a1a;color:#3a2a00;font:13px/1.5 "BIZ UDPGothic",sans-serif;pointer-events:none;white-space:nowrap;opacity:.95');
    document.documentElement.appendChild(f);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 板を出す); else 板を出す();
  window.見本の時刻 = function () { return { 開いて出た: 開いて出た, 出た表: 出た表, 最初の字: 最初の字 }; };
})();
