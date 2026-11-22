// Browser-only proof for the App's file handoff; not the native Tern renderer.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const size = 192

function changedPixels(a, b) {
  let changed = 0
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++
  }
  return changed
}

async function measure() {
  const bytes = Uint8Array.from(atob(document.querySelector('#model').textContent), c => c.charCodeAt(0))
  const { scene: model } = await new GLTFLoader().parseAsync(bytes.buffer, '')
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x17212e)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 3))

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10)
  camera.position.set(2, 1.5, 3)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(size, size)
  document.body.append(renderer.domElement)
  try {
    const gl = renderer.getContext()
    function frame() {
      renderer.render(scene, camera)
      const pixels = new Uint8Array(size * size * 4)
      gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL pixel readback failed')
      return pixels
    }

    const background = frame()
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
    model.position.sub(center)
    const pivot = new THREE.Group()
    pivot.add(model)
    scene.add(pivot)

    // Sample two frames of a Y-axis rotation at fixed phases, independent of
    // headless scheduling. A repeated pose controls for readback noise.
    const first = frame()
    const repeat = frame()
    pivot.rotation.y = Math.PI / 3
    const turned = frame()
    return [
      changedPixels(background, first),
      changedPixels(background, turned),
      changedPixels(first, repeat),
      changedPixels(first, turned)
    ]
  } finally {
    renderer.dispose()
  }
}

const result = document.querySelector('#result')
void measure().then(pixels => {
  result.textContent = pixels.join(',')
}, error => {
  result.textContent = 'error: ' + error.message
})
