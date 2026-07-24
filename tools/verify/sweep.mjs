/**
 * 전체 스위트 스윕.
 *
 * ★ `npm run -s <suite> | grep -c "FAIL"` 로 세면 **크래시한 실행이 0 으로 보인다** —
 *   단언을 하나도 못 찍고 죽었으니 FAIL 문자열도 없기 때문이다.
 *   실제로 verify:talk 이 그렇게 죽어 있었는데 "통과"로 읽고 넘어갈 뻔했다.
 *   그래서 여기서는 **종료 코드와 FAIL 수를 함께** 보고, 둘 중 하나라도 나쁘면 나쁜 것이다.
 *
 *   node tools/verify/sweep.mjs            전체
 *   node tools/verify/sweep.mjs verify:talk verify:incidents   지정한 것만
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ALL = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts)
  .filter((s) => s === 'verify' || s.startsWith('verify:'))

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ALL

function run(script) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', '-s', script], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('close', (code) => {
      const fails = (out.match(/\*\*\* FAIL/g) ?? []).length
      const crashed = code !== 0 && fails === 0
      resolve({ script, code, fails, crashed, out })
    })
  })
}

const results = []
for (const s of targets) {
  const r = await run(s)
  results.push(r)
  const verdict = r.crashed ? '*** 크래시 ***' : r.fails > 0 ? `FAIL ${r.fails}` : 'ok'
  console.log(`${s.padEnd(24)} exit=${String(r.code).padStart(3)}  ${verdict}`)
  if (r.crashed) {
    // 크래시는 원인 줄을 바로 보여 준다 — 로그를 다시 뒤지지 않도록.
    const tail = r.out.trim().split('\n').slice(-12).join('\n')
    console.log(tail.replace(/^/gm, '    │ '))
  } else if (r.fails > 0) {
    /*
     * ★ 실패한 단언 줄도 함께 찍는다.
     *   숫자만 내면 어느 단언인지 알려고 30분짜리 스위트를 다시 돌려야 한다 —
     *   실제로 ablation 에서 그랬다.
     */
    for (const line of r.out.split('\n').filter((l) => l.includes('*** FAIL'))) {
      console.log(`    │ ${line.trim()}`)
    }
  }
}

const bad = results.filter((r) => r.crashed || r.fails > 0)
console.log('')
console.log(`총 ${results.length}종 · 문제 ${bad.length}종` +
  (bad.length ? ` — ${bad.map((r) => r.script).join(', ')}` : ' — 전부 통과'))
process.exit(bad.length ? 1 : 0)
