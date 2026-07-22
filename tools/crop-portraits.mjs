// 전신 원본 → 초상용 흉상 크롭 (콘텐츠·에셋 배선 1·2).
//
// ★ 손으로 자르지 않는다. 원본(전신)은 그대로 두고, 알파 바운딩박스로 캐릭터 위치를
//   잡아 상단 흉상(머리~가슴)을 4:5 로 잘라 규격 통일한다. 재실행 가능(멱등).
//
//   군주:     characters/monarch/{male,female}/*.png → monarch/portraits/{male,female}/
//   5인:      characters/{charId}/{male,female}/*.png → portraits/{charId}/{male,female}/
//   모후·섭정: characters/others/*.png              → portraits/others/
//
//   실행:   node tools/crop-portraits.mjs            (전체)
//           node tools/crop-portraits.mjs heir       (경로에 'heir' 포함분만 — 샘플용)
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = join(ROOT, 'public/assets/characters')
const CHARS = ['heir', 'loyalist', 'prince', 'commander', 'hero']

/** 크롭할 작업 목록: {srcDir → outDir}(BASE 상대). */
const JOBS = [
  { srcDir: 'monarch/male', outDir: 'monarch/portraits/male' },
  { srcDir: 'monarch/female', outDir: 'monarch/portraits/female' },
  ...CHARS.flatMap((c) => [
    { srcDir: `${c}/male`, outDir: `portraits/${c}/male` },
    { srcDir: `${c}/female`, outDir: `portraits/${c}/female` },
  ]),
  { srcDir: 'others', outDir: 'portraits/others' },
]

// ── 크롭 규격 (배선 1 과 동일) ──────────────────────────────
const HEAD_FRACTION = 0.42
const HEADROOM = 0.015
const ASPECT_W = 4
const ASPECT_H = 5
const OUT_W = 480
const OUT_H = 600
const TRIM_THRESHOLD = 10

/** 고정 비율이 어긋나는 소수는 여기서 개별 조정한다(파일명 → 값). 대부분 비워둔 채로 맞는다. */
const EXCEPTIONS = {
  // 'heir_m_20.png': { headFraction: 0.5 },
}

async function cropOne(srcAbs, dstAbs, file) {
  const ex = EXCEPTIONS[file] ?? {}
  const headFraction = ex.headFraction ?? HEAD_FRACTION

  const meta = await sharp(srcAbs).metadata()
  const { info } = await sharp(srcAbs).trim({ threshold: TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true })
  const bx = -(info.trimOffsetLeft ?? 0)
  const by = -(info.trimOffsetTop ?? 0)
  const cw = info.width
  const ch = info.height

  let cropH = Math.round(ch * headFraction)
  let cropW = Math.round((cropH * ASPECT_W) / ASPECT_H)
  const cx = bx + cw / 2
  let left = Math.round(cx - cropW / 2)
  let top = Math.round(by - ch * HEADROOM)

  left = Math.max(0, Math.min(left, meta.width - 1))
  top = Math.max(0, Math.min(top, meta.height - 1))
  cropW = Math.min(cropW, meta.width - left)
  cropH = Math.min(cropH, meta.height - top)

  await sharp(srcAbs)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(OUT_W, OUT_H, { fit: 'cover', position: 'top' })
    .png()
    .toFile(dstAbs)
}

const filter = process.argv[2] ?? ''
let total = 0
for (const job of JOBS) {
  const srcDir = join(BASE, job.srcDir)
  if (!existsSync(srcDir)) continue
  if (filter && !job.srcDir.includes(filter)) continue
  const outDir = join(BASE, job.outDir)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.png'))
  for (const file of files) {
    await cropOne(join(srcDir, file), join(outDir, file), file)
    total += 1
  }
  if (files.length) console.log(`  ${job.srcDir}: ${files.length}장`)
}
console.log(`총 ${total}장 크롭.`)
