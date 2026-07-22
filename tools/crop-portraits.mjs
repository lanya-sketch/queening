// 군주 전신 원본 → 초상용 흉상 크롭 (콘텐츠·에셋 배선 1).
//
// ★ 손으로 자르지 않는다. 원본(전신)은 그대로 두고, 알파 바운딩박스로 캐릭터 위치를
//   잡아 상단 흉상(머리~가슴)을 4:5 로 잘라 규격 통일한다. 100장+ 를 한 번에, 재실행 가능.
//
//   원본:   public/assets/characters/monarch/{male,female}/monarch_{m|f}_{outfit}_{age}.png
//   크롭본: public/assets/characters/monarch/portraits/{male,female}/(같은 파일명)
//
//   실행:   node tools/crop-portraits.mjs            (전체)
//           node tools/crop-portraits.mjs casual     (파일명에 'casual' 포함분만 — 샘플용)
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'public/assets/characters/monarch')
const OUT_DIR = join(SRC_DIR, 'portraits')
const GENDERS = ['male', 'female']

// ── 크롭 규격 (튜닝 대상) ──────────────────────────────────
/** 흉상 높이 = 캐릭터(알파 bbox) 높이 × 이 비율. 크면 상반신까지, 작으면 얼굴 위주. */
const HEAD_FRACTION = 0.42
/** 캐릭터 머리 위 여백(캐릭터 높이 대비). 살짝 띄워 정수리가 안 잘리게. */
const HEADROOM = 0.015
/** 초상 박스 비율(가로:세로) — UI 초상 자리에 맞춘 4:5. */
const ASPECT_W = 4
const ASPECT_H = 5
/** 출력 규격(레티나 여유). UI 는 이보다 작게 표시. */
const OUT_W = 480
const OUT_H = 600
/** 알파 트림 임계값. */
const TRIM_THRESHOLD = 10

/**
 * 고정 비율이 어긋나는 소수는 여기서 개별 조정한다(파일명 → 덮어쓸 값).
 * 대부분 일러스트는 얼굴이 상단이라 비워둔 채로 잘 먹는다.
 */
const EXCEPTIONS = {
  // 'monarch_m_armor_20.png': { headFraction: 0.5 },
}

async function cropOne(gender, file) {
  const src = join(SRC_DIR, gender, file)
  const outGenderDir = join(OUT_DIR, gender)
  if (!existsSync(outGenderDir)) mkdirSync(outGenderDir, { recursive: true })
  const dst = join(outGenderDir, file)

  const ex = EXCEPTIONS[file] ?? {}
  const headFraction = ex.headFraction ?? HEAD_FRACTION

  const meta = await sharp(src).metadata()
  // 알파 bbox: 트림 오프셋(음수)로 캐릭터 위치를 복원한다.
  const { info } = await sharp(src).trim({ threshold: TRIM_THRESHOLD })
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

  // 이미지 경계로 클램프.
  left = Math.max(0, Math.min(left, meta.width - 1))
  top = Math.max(0, Math.min(top, meta.height - 1))
  cropW = Math.min(cropW, meta.width - left)
  cropH = Math.min(cropH, meta.height - top)

  await sharp(src)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(OUT_W, OUT_H, { fit: 'cover', position: 'top' })
    .png()
    .toFile(dst)
  return { file, box: `${left},${top} ${cropW}x${cropH}` }
}

const filter = process.argv[2] ?? ''
let count = 0
for (const gender of GENDERS) {
  const dir = join(SRC_DIR, gender)
  const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.includes(filter))
  for (const file of files) {
    const r = await cropOne(gender, file)
    count += 1
    if (count <= 6 || count % 20 === 0) console.log(`  ${gender}/${r.file}  → ${r.box}`)
  }
  console.log(`${gender}: ${files.length}장 크롭`)
}
console.log(`총 ${count}장 → ${OUT_DIR}`)
