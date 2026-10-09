
const rays = [
  { x: 107.469, y: 199.301, width: 14.5784, height: 71.4846, rotation: 'rotate(179.9 107.469 199.301)' },
  { x: 106.959, y: 75.4922, width: 14, height: 75.9607, rotation: 'rotate(179.9 106.959 75.4922)' },
  { x: 143.756, y: 9.25391, width: 14.5784, height: 75.6694, rotation: 'rotate(29.36 143.756 9.25391)' },
  { x: 81.0488, y: 120.723, width: 14.5784, height: 72.1569, rotation: 'rotate(29.36 81.0488 120.723)' },
  { x: 182.494, y: 44.0703, width: 14.5784, height: 74.1255, rotation: 'rotate(59 182.494 44.0703)' },
  { x: 74.0938, y: 109.203, width: 14.5784, height: 73.7623, rotation: 'rotate(59 74.0938 109.203)' },
  { x: 154.41, y: 183.598, width: 14.5784, height: 72.0479, rotation: 'rotate(150.64 154.41 183.598)' },
  { x: 93.6016, y: 75.5156, width: 14.5784, height: 76.0357, rotation: 'rotate(150.64 93.6016 75.5156)' },
  { x: 189.061, y: 147.113, width: 14.5784, height: 74.0452, rotation: 'rotate(121 189.061 147.113)' },
  { x: 81.2207, y: 82.3086, width: 14.5784, height: 74.4117, rotation: 'rotate(121 81.2207 82.3086)' },
  { x: 126.053, y: 109.227, width: 14.5784, height: 73.8174, rotation: 'rotate(-90 126.053 109.227)' },
  { x: 0.0292969, y: 109.227, width: 14.5784, height: 73.8174, rotation: 'rotate(-90 0.0292969 109.227)' },
];

export function SwasthyaFlowLogo() {
  return (
    <span className="swasthya-logo">
      <span className="swasthya-wordmark">SwasthyaFlow</span>
      <svg className="swasthya-logomark" viewBox="0 0 200 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <g className="swasthya-rays" fill="currentColor">
          {rays.map((ray, index) => <rect key={index} x={ray.x} y={ray.y} width={ray.width} height={ray.height} transform={ray.rotation} />)}
        </g>
        <path d="M125.99 109.126C126.647 106.523 126.998 103.645 126.998 100.492C126.998 85.3044 114.91 72.9922 99.998 72.9922C85.0864 72.9922 72.998 85.3044 72.998 100.492C72.998 103.65 73.3502 106.53 74.0083 109.137L100.005 82.6735L125.99 109.126Z" fill="currentColor" />
      </svg>
    </span>
  );
}
