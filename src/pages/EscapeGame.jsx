import EmbeddedGamePage from './EmbeddedGamePage'

export default function EscapeGame() {
  return (
    <EmbeddedGamePage
      title="FRACTURE"
      wide
      src="games/escape-game/index.html"
      hint={
        'FRACTURE는 “갈라진 틈, 균열”이라는 뜻이에요. 무너져 가는 4개의 차원에서 시간 안에 탈출하세요.\n' +
        '개발중인 게임이라 일부 기능이 미완성일 수 있어요.'
      }
    />
  )
}
