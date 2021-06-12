export function Plural({ n, singular, plural = null }) {
  return <>{`${n} ${n === 1 ? singular : (plural || singular + 's')}`}</>;
}
