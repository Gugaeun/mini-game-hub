// Pixel-art red-panda mascot used across the site (sprites live in public/mascot/).
// pose: 'idle' | 'shooting' | 'rhythm' | 'lying'
//   idle / shooting → front view, rhythm → front view with headphones,
//   lying → resting on its belly, tail swaying (animated GIF; a still frame is used when the user
//   prefers reduced motion)
//
// `size` is the desired HEIGHT in px. To keep the pixels crisp the sprite is only drawn at
// whole-number multiples of its native size, so `size` is rounded to the nearest multiple.
const FRONT = { src: 'mascot/red-panda-front.png', w: 32, h: 38 }
const MUSIC = { src: 'mascot/red-panda-music.png', w: 38, h: 43 }
const LYING = { src: 'mascot/red-panda-lying.gif', still: 'mascot/red-panda-lying-still.png', w: 67, h: 39 }

const SPRITES = { idle: FRONT, shooting: FRONT, rhythm: MUSIC, lying: LYING }

// All sprites share one pixel scale (based on the plain front sprite's height), so a pixel is the same
// size on every screen even though the headphone sprite is a bit taller.
const BASE_HEIGHT = FRONT.h

export default function Mascot({ pose = 'idle', size = 120 }) {
  const sprite = SPRITES[pose] ?? FRONT
  const scale = Math.max(1, Math.round(size / BASE_HEIGHT))

  const url = (path) => `${import.meta.env.BASE_URL}${path}`

  const img = (
    <img
      className="mascot"
      src={url(sprite.src)}
      width={sprite.w * scale}
      height={sprite.h * scale}
      alt="레서판다 마스코트"
      draggable={false}
      style={{ imageRendering: 'pixelated' }}
    />
  )

  // 움직이는 GIF 는 '동작 줄이기' 설정을 켠 사용자에게 정지 이미지로 대신 보여준다.
  if (!sprite.still) return img
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={url(sprite.still)} />
      {img}
    </picture>
  )
}
