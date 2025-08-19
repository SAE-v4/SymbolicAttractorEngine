attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
  // Fullscreen triangle in clip space
  v_uv = (a_pos * 0.5) + 0.5;     // [-1,1] -> [0,1]
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
