// OpenCode プラグイン: rm -r で / や $HOME などの重要な場所を消すコマンドを止める
// 使い方: .opencode/plugins/block-rm.js に置く(起動時に自動で読み込まれる)

// rm の再帰オプション(-r, -rf, -fr, -R, --recursive)があるか
const rmRe = /(^|[^\w./-])rm\s+([^"|;&]*\s)?(-\w*[rR]\w*|--recursive)(\s|"|$)/;
// 対象が / /* ~ ~/ ~/* $HOME ${HOME} のいずれかか
const targetRe = /\s["']?(\/|\/\*|~|~\/|~\/\*|\$HOME|\$\{HOME\}|\$HOME\/|\$HOME\/\*|\$\{HOME\}\/|\$\{HOME\}\/\*)(\s|"|'|;|\||&|$)/;

// 危険なコマンドか判定する(; | & と改行で区切り、区切りごとに見る)
export const isDangerous = (cmd) =>
  cmd.split(/[;|&\n]/).some((seg) => rmRe.test(seg) && targetRe.test(seg));

export const BlockRm = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "bash") return;
    if (isDangerous(String(output.args?.command ?? ""))) {
      throw new Error("危険な rm -r (/ や HOME が対象) のためブロックしました");
    }
  },
});
