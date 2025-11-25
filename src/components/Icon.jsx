export default function Icon({ src, alt, size = 22 }) {
  return <img src={src} alt={alt} className="select-none" style={{ width: size }} />;
}
