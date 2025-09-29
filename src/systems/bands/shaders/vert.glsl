#version 300 es
precision highp float;

// Fullscreen triangle (no VBO needed if you prefer gl_VertexID trick)
layout(location=0) in vec2 a_pos; // [-1,1] clip-space quad, if using VAO
out vec2 v_uv;

void main() {
  v_uv = 0.5 * (a_pos + 1.0); // map [-1,1] -> [0,1]
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
