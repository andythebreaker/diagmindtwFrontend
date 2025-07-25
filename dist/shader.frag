precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

// hash 與基礎 noise
float hash(vec2 p) {
  return fract(sin(dot(p ,vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 改良版高斯噪點：加入空間抖動避免垂直條紋
float betterGaussianNoise(vec2 uv) {
  vec2 jitter = vec2(
    noise(uv * 12.123 + u_time * 0.5),
    noise(uv * 17.321 - u_time * 0.3)
  );
  jitter = fract(jitter * 43758.5453);
  
  float u1 = clamp(jitter.x, 0.0001, 0.9999);
  float u2 = jitter.y;
  
  float z = sqrt(-2.0 * log(u1)) * cos(6.2831 * u2);
  return z * 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv *= 2.0;//AI 4.0
  float t = u_time * 0.2;
  float amplitude = 0.5;
  float frequency = 1.0;
  float n = 0.0;

  for (int i = 0; i < 5; i++) {//AI 5
    n += amplitude * noise(uv * frequency + t);
    frequency *= 15.0;//AI 2.0
    amplitude *= 0.5;
  }

  vec3 smokeColor = vec3(0.22, 0.631, 0.859); 
  vec3 bgColor = vec3(0.914, 0.961, 0.961); 
  vec3 color = mix(smokeColor, bgColor, n); 

  float g = betterGaussianNoise(uv * u_resolution.xy);
  float noiseStrength = 0.03;

  vec3 gaussianColor = vec3(
    0.5 + 0.5 * sin(g * 5.0),
    0.5 + 0.5 * sin(g * 7.0 + 1.0),
    0.5 + 0.5 * sin(g * 9.0 + 2.0)
  );

  color += g * noiseStrength * gaussianColor;

  gl_FragColor = vec4(color, 0.7);
}
