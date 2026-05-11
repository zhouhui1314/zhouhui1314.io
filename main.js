/* ============================================================
   main.js — 个人主页主脚本
   功能：3D背景 | 鼠标尾迹 | 滚动动画 | 音乐控制 | 移动端重定向
   ============================================================ */

(function () {
    'use strict';

    /* ================================================================
       【可选】开发者工具禁用 — 如需启用请取消下面代码的注释
       ================================================================ */
    // if (typeof DisableDevtool === 'function') {
    //   DisableDevtool({
    //     disableMenu: true,      // 禁用右键菜单
    //     disableF12: true,       // 禁用 F12
    //     disableCtrlShiftI: true,// 禁用 Ctrl+Shift+I
    //     disableCtrlShiftJ: true,// 禁用 Ctrl+Shift+J
    //     disableCtrlU: true,     // 禁用 Ctrl+U
    //   });
    // }

    /* ================================================================
       设备检测 & 响应式类名设置
       ================================================================ */
    const body = document.body;
    const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
    const isSmallScreen = window.innerWidth < 768;

    // 设置响应式类名
    function updateDeviceClass() {
        const mobile = isMobileDevice || window.innerWidth < 768;
        body.classList.remove('is-desktop', 'is-mobile');
        body.classList.add(mobile ? 'is-mobile' : 'is-desktop');
    }
    updateDeviceClass();
    window.addEventListener('resize', updateDeviceClass);

    /* ================================================================
       移动端自动重定向弹窗
       ================================================================ */
    const MOBILE_REDIRECT_URL = '#'; // ⚠️ 替换为你的移动版网址
    const STORAGE_KEY = 'stay_desktop';

    function shouldShowMobileRedirect() {
        if (!isMobileDevice && !isSmallScreen) return false;
        if (sessionStorage.getItem(STORAGE_KEY) === 'true') return false;
        return true;
    }

    function showMobileRedirectModal() {
        const modal = document.getElementById('mobileRedirectModal');
        if (!modal) return;
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');

        const btnGo = document.getElementById('btnGoMobile');
        const btnStay = document.getElementById('btnStayDesktop');

        function closeModal() {
            modal.setAttribute('hidden', '');
            modal.setAttribute('aria-hidden', 'true');
        }

        btnGo.addEventListener('click', function () {
            sessionStorage.setItem(STORAGE_KEY, 'false');
            window.location.href = MOBILE_REDIRECT_URL;
        });

        btnStay.addEventListener('click', function () {
            sessionStorage.setItem(STORAGE_KEY, 'true');
            closeModal();
        });

        // 点击背景也可关闭
        modal.querySelector('.modal-backdrop').addEventListener('click', function () {
            sessionStorage.setItem(STORAGE_KEY, 'true');
            closeModal();
        });
    }

    if (shouldShowMobileRedirect()) {
        // 延迟显示，让页面先渲染
        setTimeout(showMobileRedirectModal, 600);
    }

    /* ================================================================
       Three.js 3D 动态背景
       ================================================================ */
    function initThreeJSBackground() {
        const canvas = document.getElementById('three-bg');
        if (!canvas || typeof THREE === 'undefined') {
            console.warn('Three.js 未加载或 canvas 元素不存在，跳过 3D 背景初始化');
            return;
        }

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以保证性能
        renderer.setSize(window.innerWidth, window.innerHeight);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 100);
        const cameraBase = { x: 0, y: 1.5, z: 12 };
        camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);
        camera.lookAt(0, 0, 0);

        renderer.setClearColor(0x000000, 0);

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        const zoomConfig = {
            speed: 0.004,
            minZ: 7.5,
            maxZ: 18.5,
            damping: 9,
        };

        const zoomState = {
            targetOffsetZ: 0,
            currentOffsetZ: 0,
            enabled: true,
        };

        function clampZoomOffsets() {
            const minOffset = zoomConfig.minZ - cameraBase.z;
            const maxOffset = zoomConfig.maxZ - cameraBase.z;
            zoomState.targetOffsetZ = clamp(zoomState.targetOffsetZ, minOffset, maxOffset);
            zoomState.currentOffsetZ = clamp(zoomState.currentOffsetZ, minOffset, maxOffset);
        }

        function createScrollDeltaDetector(options) {
            const cfg = options || {};
            const threshold = typeof cfg.thresholdPx === 'number' ? cfg.thresholdPx : 5;
            let lastTop = typeof cfg.initialTop === 'number' ? cfg.initialTop : 0;
            let lastLeft = typeof cfg.initialLeft === 'number' ? cfg.initialLeft : 0;
            let accY = 0;
            let accX = 0;
            let dirY = 0;
            let dirX = 0;

            function sign(n) {
                return n > 0 ? 1 : n < 0 ? -1 : 0;
            }

            function updateDir(prevDir, delta) {
                const d = sign(delta);
                if (!d) return prevDir;
                return d;
            }

            function shouldTrigger(acc) {
                return Math.abs(acc) >= threshold;
            }

            return {
                update: function (top, left) {
                    const curTop = typeof top === 'number' ? top : lastTop;
                    const curLeft = typeof left === 'number' ? left : lastLeft;
                    const dy = curTop - lastTop;
                    const dx = curLeft - lastLeft;
                    lastTop = curTop;
                    lastLeft = curLeft;

                    const nextDirY = updateDir(dirY, dy);
                    const nextDirX = updateDir(dirX, dx);
                    const dirChangedY = nextDirY && nextDirY !== dirY;
                    const dirChangedX = nextDirX && nextDirX !== dirX;
                    dirY = nextDirY || dirY;
                    dirX = nextDirX || dirX;

                    if (dirChangedY) accY = 0;
                    if (dirChangedX) accX = 0;

                    accY += dy;
                    accX += dx;

                    const triggerY = shouldTrigger(accY);
                    const triggerX = shouldTrigger(accX);

                    const out = {
                        top: curTop,
                        left: curLeft,
                        deltaY: dy,
                        deltaX: dx,
                        dirY: dirY,
                        dirX: dirX,
                        triggerY: triggerY,
                        triggerX: triggerX,
                        accY: accY,
                        accX: accX,
                        dirChangedY: dirChangedY,
                        dirChangedX: dirChangedX,
                    };

                    if (triggerY) accY = 0;
                    if (triggerX) accX = 0;
                    return out;
                },
                getState: function () {
                    return {
                        lastTop: lastTop,
                        lastLeft: lastLeft,
                        accY: accY,
                        accX: accX,
                        dirY: dirY,
                        dirX: dirX,
                        thresholdPx: threshold,
                    };
                },
            };
        }

        function initScrollBasedZoom() {
            const scrollingEl = document.scrollingElement || document.documentElement || document.body;
            if (!scrollingEl) return null;

            const detector = createScrollDeltaDetector({
                thresholdPx: 5,
                initialTop: scrollingEl.scrollTop,
                initialLeft: scrollingEl.scrollLeft,
            });

            const metrics = {
                scrollEvents: 0,
                rAFReads: 0,
                triggerY: 0,
                triggerX: 0,
                lastDirY: 0,
                lastTop: scrollingEl.scrollTop,
            };

            let rafScheduled = false;

            function readAndProcess() {
                rafScheduled = false;
                metrics.rAFReads += 1;
                const res = detector.update(scrollingEl.scrollTop, scrollingEl.scrollLeft);
                metrics.lastDirY = res.dirY;
                metrics.lastTop = res.top;

                if (res.triggerY) {
                    metrics.triggerY += 1;
                    if (zoomState.enabled) {
                        zoomState.targetOffsetZ += res.accY * zoomConfig.speed;
                        clampZoomOffsets();
                    }
                }

                if (res.triggerX) {
                    metrics.triggerX += 1;
                }
            }

            function onScroll() {
                metrics.scrollEvents += 1;
                if (rafScheduled) return;
                rafScheduled = true;
                requestAnimationFrame(readAndProcess);
            }

            window.addEventListener('scroll', onScroll, { passive: true });

            return {
                destroy: function () {
                    window.removeEventListener('scroll', onScroll);
                },
                getMetrics: function () {
                    return Object.assign({}, metrics, { detector: detector.getState() });
                },
                detector: detector,
            };
        }

        const scrollZoom = initScrollBasedZoom();
        window.ScrollGesture = {
            getScrollZoomMetrics: function () {
                return scrollZoom ? scrollZoom.getMetrics() : null;
            },
            test: {
                run: function () {
                    function assert(name, ok, details) {
                        if (!ok) {
                            throw new Error(name + (details ? ': ' + details : ''));
                        }
                    }

                    const d = createScrollDeltaDetector({ thresholdPx: 5, initialTop: 0, initialLeft: 0 });
                    let r;

                    r = d.update(3, 0);
                    assert('slow scroll below threshold', !r.triggerY, 'triggered unexpectedly');
                    r = d.update(6, 0);
                    assert('slow scroll crosses threshold', r.triggerY, 'did not trigger');
                    assert('dir down', r.dirY === 1, 'dirY=' + r.dirY);

                    r = d.update(40, 0);
                    assert('fast scroll triggers', r.triggerY, 'did not trigger fast');
                    assert('fast scroll down dir', r.dirY === 1, 'dirY=' + r.dirY);

                    r = d.update(38, 0);
                    assert('reverse scroll triggers after threshold', r.triggerY, 'did not trigger reverse');
                    assert('reverse dir up', r.dirY === -1, 'dirY=' + r.dirY);

                    r = d.update(38, 0);
                    assert('no movement no trigger', !r.triggerY, 'triggered unexpectedly');

                    const d2 = createScrollDeltaDetector({ thresholdPx: 5, initialTop: 0, initialLeft: 0 });
                    r = d2.update(0, 0);
                    assert('top boundary no movement', !r.triggerY, 'triggered unexpectedly');
                    r = d2.update(0, 0);
                    assert('top boundary rebound no trigger', !r.triggerY, 'triggered unexpectedly');

                    return { ok: true };
                },
            },
            perf: {
                run: function (durationMs) {
                    const dur = typeof durationMs === 'number' ? durationMs : 3000;
                    const start = performance.now();
                    let frames = 0;
                    let last = start;
                    let minDt = Infinity;
                    let maxDt = 0;
                    const memStart = performance.memory && performance.memory.usedJSHeapSize ? performance.memory.usedJSHeapSize : 0;

                    return new Promise(function (resolve) {
                        function tick(ts) {
                            frames += 1;
                            const dt = ts - last;
                            last = ts;
                            if (dt > 0) {
                                minDt = Math.min(minDt, dt);
                                maxDt = Math.max(maxDt, dt);
                            }
                            if (ts - start >= dur) {
                                const memEnd = performance.memory && performance.memory.usedJSHeapSize ? performance.memory.usedJSHeapSize : 0;
                                const avgFps = (frames * 1000) / (ts - start);
                                resolve({
                                    durationMs: ts - start,
                                    frames: frames,
                                    avgFps: avgFps,
                                    minFrameMs: minDt,
                                    maxFrameMs: maxDt,
                                    heapDeltaBytes: memEnd && memStart ? memEnd - memStart : null,
                                    scrollZoom: scrollZoom ? scrollZoom.getMetrics() : null,
                                });
                                return;
                            }
                            requestAnimationFrame(tick);
                        }
                        requestAnimationFrame(tick);
                    });
                },
            },
        };

        const themeState = {
            value: document.body.classList.contains('theme-neon') ? 1 : 0,
        };
        let audioEnergy = 0;
        let rippleColor = themeState.value ? 0xff3da6 : 0x7cacf8;

        const bgGroup = new THREE.Group();
        const midGroup = new THREE.Group();
        const fgGroup = new THREE.Group();
        scene.add(bgGroup);
        scene.add(midGroup);
        scene.add(fgGroup);

        function createGlowPointsMaterial(options) {
            const opts = options || {};
            return new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    uTime: { value: 0 },
                    uSize: { value: typeof opts.size === 'number' ? opts.size : 18 },
                    uOpacity: { value: typeof opts.opacity === 'number' ? opts.opacity : 0.8 },
                    uFlow: { value: typeof opts.flow === 'number' ? opts.flow : 1.0 },
                    uTheme: { value: 0 },
                    uAudio: { value: 0 },
                },
                vertexShader:
                    'precision mediump float;\n' +
                    'attribute vec3 color;\n' +
                    'varying vec3 vColor;\n' +
                    'uniform float uTime;\n' +
                    'uniform float uSize;\n' +
                    'uniform float uFlow;\n' +
                    'uniform float uAudio;\n' +
                    'void main(){\n' +
                    '  vColor = color;\n' +
                    '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n' +
                    '  float d = length(position) * 0.12;\n' +
                    '  float pulse = 0.72 + 0.28 * sin(uTime * (1.1 * uFlow) + d * 6.0) + uAudio * 0.35;\n' +
                    '  float size = uSize * pulse;\n' +
                    '  float attn = 220.0 / max(2.0, -mvPosition.z);\n' +
                    '  gl_PointSize = clamp(size * attn, 1.0, 36.0);\n' +
                    '  gl_Position = projectionMatrix * mvPosition;\n' +
                    '}\n',
                fragmentShader:
                    'precision mediump float;\n' +
                    'varying vec3 vColor;\n' +
                    'uniform float uTime;\n' +
                    'uniform float uOpacity;\n' +
                    'uniform float uFlow;\n' +
                    'uniform float uTheme;\n' +
                    'uniform float uAudio;\n' +
                    'void main(){\n' +
                    '  vec2 uv = gl_PointCoord - vec2(0.5);\n' +
                    '  float r = length(uv);\n' +
                    '  float core = smoothstep(0.36, 0.0, r);\n' +
                    '  float halo = smoothstep(0.5, 0.12, r);\n' +
                    '  float flow = 0.65 + 0.35 * sin(uTime * (0.9 * uFlow) + vColor.r * 7.0 + vColor.b * 5.0);\n' +
                    '  vec3 col = vColor;\n' +
                    '  col = mix(col, vec3(col.b, col.r, col.g), 0.18 * flow);\n' +
                    '  vec3 alt = clamp(vec3(col.r * 1.15 + 0.12, col.g * 0.55, col.b * 0.28), 0.0, 1.0);\n' +
                    '  vec3 themed = mix(col, alt, uTheme);\n' +
                    '  float energy = 1.0 + uAudio * 0.35;\n' +
                    '  float alpha = (core * 0.9 + halo * 0.55) * uOpacity * (0.62 + uAudio * 0.28);\n' +
                    '  gl_FragColor = vec4(themed * (1.05 + 0.25 * flow) * energy, alpha);\n' +
                    '}\n',
            });
        }

        const starCount = isMobileDevice ? 360 : 900;
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const radius = 10 + Math.random() * 18;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = radius * Math.cos(phi);

            const colorChoice = Math.random();
            if (colorChoice < 0.35) {
                starColors[i * 3] = 0.45;
                starColors[i * 3 + 1] = 0.55;
                starColors[i * 3 + 2] = 0.95;
            } else if (colorChoice < 0.65) {
                starColors[i * 3] = 0.68;
                starColors[i * 3 + 1] = 0.45;
                starColors[i * 3 + 2] = 0.9;
            } else {
                starColors[i * 3] = 0.82;
                starColors[i * 3 + 1] = 0.78;
                starColors[i * 3 + 2] = 0.98;
            }
        }

        const starGeometry = null;

        const ringCount = isMobileDevice ? 240 : 520;
        const ringGeometry = new THREE.BufferGeometry();
        const ringPositions = new Float32Array(ringCount * 3);
        const ringColors = new Float32Array(ringCount * 3);

        const majorRadius = 4.7;
        const minorRadius = 0.7;
        for (let i = 0; i < ringCount; i++) {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
            const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
            const z = minorRadius * Math.sin(v);
            ringPositions[i * 3] = x + (Math.random() - 0.5) * 0.32;
            ringPositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.32;
            ringPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.32;

            ringColors[i * 3] = 0.49;
            ringColors[i * 3 + 1] = 0.68;
            ringColors[i * 3 + 2] = 1.0;
        }

        ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
        ringGeometry.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

        const ringMaterial = createGlowPointsMaterial({
            size: isMobileDevice ? 12 : 16,
            opacity: 0.46,
            flow: 1.25,
        });
        ringMaterial.uniforms.uTheme.value = themeState.value;
        const ring = new THREE.Points(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 3.5;
        ring.rotation.y = Math.PI / 6;
        midGroup.add(ring);

        const networkEnabled = !isMobileDevice && !isSmallScreen;
        const network = {
            enabled: networkEnabled,
            edges: [],
            staticLines: null,
            focusLines: null,
            focusPositions: null,
            focusColors: null,
            focusGeometry: null,
            lastFocusUpdate: 0,
            focusCursor: 0,
        };

        function buildNetwork() {
            if (!network.enabled) return;

            const nodeCount = 520;
            const maxDist = 12.8;
            const maxLinksPerNode = 4;
            const maxDistSq = maxDist * maxDist;

            const indices = new Array(nodeCount);
            for (let i = 0; i < nodeCount; i++) indices[i] = (Math.random() * starCount) | 0;

            const nearestIdx = new Array(nodeCount);
            const nearestDsq = new Array(nodeCount);
            for (let i = 0; i < nodeCount; i++) {
                nearestIdx[i] = new Array(maxLinksPerNode).fill(-1);
                nearestDsq[i] = new Array(maxLinksPerNode).fill(Infinity);
            }

            function insertNearest(i, j, dsq) {
                const dArr = nearestDsq[i];
                const jArr = nearestIdx[i];
                for (let k = 0; k < maxLinksPerNode; k++) {
                    if (dsq < dArr[k]) {
                        for (let s = maxLinksPerNode - 1; s > k; s--) {
                            dArr[s] = dArr[s - 1];
                            jArr[s] = jArr[s - 1];
                        }
                        dArr[k] = dsq;
                        jArr[k] = j;
                        return;
                    }
                }
            }

            for (let a = 0; a < nodeCount; a++) {
                const ia = indices[a] * 3;
                const ax = starPositions[ia];
                const ay = starPositions[ia + 1];
                const az = starPositions[ia + 2];

                for (let b = a + 1; b < nodeCount; b++) {
                    const ib = indices[b] * 3;
                    const dx = ax - starPositions[ib];
                    const dy = ay - starPositions[ib + 1];
                    const dz = az - starPositions[ib + 2];
                    const dsq = dx * dx + dy * dy + dz * dz;
                    if (dsq > maxDistSq) continue;
                    insertNearest(a, b, dsq);
                    insertNearest(b, a, dsq);
                }
            }

            const edgeSet = new Set();
            const edges = [];
            for (let a = 0; a < nodeCount; a++) {
                for (let k = 0; k < maxLinksPerNode; k++) {
                    const b = nearestIdx[a][k];
                    if (b < 0) continue;
                    const ia = indices[a];
                    const ib = indices[b];
                    const lo = ia < ib ? ia : ib;
                    const hi = ia < ib ? ib : ia;
                    const key = lo + ',' + hi;
                    if (edgeSet.has(key)) continue;
                    edgeSet.add(key);
                    edges.push([lo, hi]);
                }
            }
            network.edges = edges;

            const staticPositions = new Float32Array(edges.length * 2 * 3);
            const staticColors = new Float32Array(edges.length * 2 * 3);
            let ptr = 0;
            for (let e = 0; e < edges.length; e++) {
                const a = edges[e][0];
                const b = edges[e][1];
                const ia = a * 3;
                const ib = b * 3;

                staticPositions[ptr] = starPositions[ia];
                staticPositions[ptr + 1] = starPositions[ia + 1];
                staticPositions[ptr + 2] = starPositions[ia + 2];

                staticPositions[ptr + 3] = starPositions[ib];
                staticPositions[ptr + 4] = starPositions[ib + 1];
                staticPositions[ptr + 5] = starPositions[ib + 2];

                const cr = (starColors[ia] + starColors[ib]) * 0.5;
                const cg = (starColors[ia + 1] + starColors[ib + 1]) * 0.5;
                const cb = (starColors[ia + 2] + starColors[ib + 2]) * 0.5;

                staticColors[ptr] = cr;
                staticColors[ptr + 1] = cg;
                staticColors[ptr + 2] = cb;
                staticColors[ptr + 3] = cr;
                staticColors[ptr + 4] = cg;
                staticColors[ptr + 5] = cb;

                ptr += 6;
            }

            const staticGeometry = new THREE.BufferGeometry();
            staticGeometry.setAttribute('position', new THREE.BufferAttribute(staticPositions, 3));
            staticGeometry.setAttribute('color', new THREE.BufferAttribute(staticColors, 3));
            const staticMaterial = new THREE.LineBasicMaterial({
                transparent: true,
                opacity: 0.14,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: true,
            });
            network.staticLines = new THREE.LineSegments(staticGeometry, staticMaterial);
            bgGroup.add(network.staticLines);

            const maxFocusSegments = 1600;
            network.focusPositions = new Float32Array(maxFocusSegments * 2 * 3);
            network.focusColors = new Float32Array(maxFocusSegments * 2 * 3);
            network.focusGeometry = new THREE.BufferGeometry();
            network.focusGeometry.setAttribute('position', new THREE.BufferAttribute(network.focusPositions, 3));
            network.focusGeometry.setAttribute('color', new THREE.BufferAttribute(network.focusColors, 3));
            const focusMaterial = new THREE.LineBasicMaterial({
                transparent: true,
                opacity: 0.62,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: true,
            });
            network.focusLines = new THREE.LineSegments(network.focusGeometry, focusMaterial);
            bgGroup.add(network.focusLines);
        }

        const icoGeometry = new THREE.IcosahedronGeometry(0.9, 1);
        const icoEdges = new THREE.EdgesGeometry(icoGeometry);
        const icoLine = new THREE.LineSegments(
            icoEdges,
            new THREE.LineBasicMaterial({
                color: 0x8eb8ff,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        fgGroup.add(icoLine);

        const knotGeometry = new THREE.TorusKnotGeometry(1.35, 0.28, 160, 18, 2, 3);
        const knotEdges = new THREE.EdgesGeometry(knotGeometry);
        const knotLine = new THREE.LineSegments(
            knotEdges,
            new THREE.LineBasicMaterial({
                color: 0x7cacf8,
                transparent: true,
                opacity: 0.26,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        knotLine.rotation.x = Math.PI / 3;
        knotLine.rotation.y = -Math.PI / 8;
        fgGroup.add(knotLine);

        const vortexEnabled = false;

        function applyThemeValue(nextValue) {
            themeState.value = nextValue >= 0.5 ? 1 : 0;
            rippleColor = themeState.value ? 0xff3da6 : 0x7cacf8;
            ringMaterial.uniforms.uTheme.value = themeState.value;

            const primary = themeState.value ? 0xff3da6 : 0x8eb8ff;
            const secondary = themeState.value ? 0xff7a18 : 0x7cacf8;
            icoLine.material.color.setHex(primary);
            knotLine.material.color.setHex(secondary);
        }

        applyThemeValue(themeState.value);

        buildNetwork();

        // --- 鼠标响应变量 ---
        let mouseX = 0;
        let mouseY = 0;
        let targetMouseX = 0;
        let targetMouseY = 0;

        document.addEventListener('mousemove', function (e) {
            targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
            targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // 移动端使用设备陀螺仪或禁用鼠标响应
        if (isMobileDevice) {
            targetMouseX = 0;
            targetMouseY = 0;
        }

        const raycaster = new THREE.Raycaster();
        const mouseNDC = new THREE.Vector2();
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const mouseWorld = new THREE.Vector3();

        let hoverTarget = 0;
        let hoverBoost = 0;
        document.querySelectorAll('.project-card, .cta-btn, .contact-item').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                hoverTarget = 1;
            });
            el.addEventListener('mouseleave', function () {
                hoverTarget = 0;
            });
        });

        const ripples = [];
        function spawnRippleAt(point) {
            const ringGeo = new THREE.RingGeometry(0.05, 0.065, 48, 1);
            const ringMat = new THREE.MeshBasicMaterial({
                color: rippleColor,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.position.copy(point);
            fgGroup.add(ringMesh);
            ripples.push({
                mesh: ringMesh,
                start: performance.now(),
                duration: 900,
                maxScale: 42,
            });
        }

        document.addEventListener(
            'click',
            function (e) {
                if (isMobileDevice || isSmallScreen) return;
                targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
                targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
                mouseNDC.set(targetMouseX, targetMouseY);
                raycaster.setFromCamera(mouseNDC, camera);
                raycaster.ray.intersectPlane(planeZ, mouseWorld);
                spawnRippleAt(mouseWorld);
            },
            { passive: true }
        );

        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            if (typeof gsap.registerPlugin === 'function') {
                gsap.registerPlugin(ScrollTrigger);
            }
            const sectionIds = ['#hero', '#message', '#beliefs', '#vision', '#projects', '#contact'];
            const presets = [
                { x: 0.0, y: 1.5, z: 12.0 },
                { x: 0.6, y: 1.25, z: 11.2 },
                { x: -0.8, y: 1.7, z: 10.4 },
                { x: 0.15, y: 2.0, z: 9.8 },
                { x: 0.55, y: 1.35, z: 10.6 },
                { x: -0.35, y: 1.2, z: 11.6 },
            ];
            sectionIds.forEach(function (id, idx) {
                const el = document.querySelector(id);
                if (!el) return;
                const to = presets[idx] || presets[0];
                ScrollTrigger.create({
                    trigger: el,
                    start: 'top 62%',
                    end: 'bottom 38%',
                    onEnter: function () {
                        gsap.to(cameraBase, { x: to.x, y: to.y, z: to.z, duration: 1.05, ease: 'power2.out', overwrite: true });
                    },
                    onEnterBack: function () {
                        gsap.to(cameraBase, { x: to.x, y: to.y, z: to.z, duration: 1.05, ease: 'power2.out', overwrite: true });
                    },
                });
            });
        }

        // --- 动画循环 ---
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);

            const dt = Math.min(clock.getDelta(), 0.1);
            const elapsed = performance.now() * 0.001;

            // 平滑跟随鼠标
            mouseX += (targetMouseX - mouseX) * 2.5 * dt;
            mouseY += (targetMouseY - mouseY) * 2.5 * dt;

            ringMaterial.uniforms.uTime.value = elapsed;
            ringMaterial.uniforms.uAudio.value = audioEnergy;

            hoverBoost += (hoverTarget - hoverBoost) * Math.min(1, dt * 10);

            const bgPx = mouseX * 0.22;
            const bgPy = mouseY * 0.14;
            const midPx = mouseX * 0.42;
            const midPy = mouseY * 0.28;
            const fgPx = mouseX * 0.68;
            const fgPy = mouseY * 0.44;

            bgGroup.position.x += (bgPx - bgGroup.position.x) * Math.min(1, dt * 2.2);
            bgGroup.position.y += (bgPy - bgGroup.position.y) * Math.min(1, dt * 2.2);
            midGroup.position.x += (midPx - midGroup.position.x) * Math.min(1, dt * 2.6);
            midGroup.position.y += (midPy - midGroup.position.y) * Math.min(1, dt * 2.6);
            fgGroup.position.x += (fgPx - fgGroup.position.x) * Math.min(1, dt * 3.2);
            fgGroup.position.y += (fgPy - fgGroup.position.y) * Math.min(1, dt * 3.2);

            ring.rotation.z += 0.16 * dt;
            ring.rotation.x += Math.sin(elapsed * 0.4) * 0.08 * dt;

            icoLine.rotation.x += 0.42 * dt;
            icoLine.rotation.y += 0.52 * dt;
            icoLine.rotation.z += 0.28 * dt;

            knotLine.rotation.y += 0.22 * dt;
            knotLine.rotation.x += 0.12 * dt;
            knotLine.rotation.z += 0.16 * dt;

            fgGroup.rotation.y += (mouseX * 0.14 - fgGroup.rotation.y) * Math.min(1, dt * 2.8);
            fgGroup.rotation.x += (mouseY * 0.11 - fgGroup.rotation.x) * Math.min(1, dt * 2.8);

            mouseNDC.set(mouseX, mouseY);
            raycaster.setFromCamera(mouseNDC, camera);
            raycaster.ray.intersectPlane(planeZ, mouseWorld);

            if (network.enabled && network.focusLines && network.focusGeometry && network.focusPositions && network.focusColors) {
                const now = performance.now();
                const updateEveryMs = 45;
                if (now - network.lastFocusUpdate > updateEveryMs) {
                    network.lastFocusUpdate = now;

                    const edges = network.edges;
                    const maxSegments = (network.focusPositions.length / 6) | 0;

                    let ptr = 0;
                    let checked = 0;
                    const start = network.focusCursor;
                    const step = 13;

                    const ro = raycaster.ray.origin;
                    const rd = raycaster.ray.direction;
                    const rayRadius = 2.6 + hoverBoost * 1.9 + audioEnergy * 1.4;
                    const rayRadiusSq = rayRadius * rayRadius;

                    while (ptr < maxSegments * 6 && checked < edges.length) {
                        const idx = (start + checked * step) % edges.length;
                        const a = edges[idx][0];
                        const b = edges[idx][1];
                        const ia = a * 3;
                        const ib = b * 3;

                        const mx = (starPositions[ia] + starPositions[ib]) * 0.5 + bgGroup.position.x;
                        const my = (starPositions[ia + 1] + starPositions[ib + 1]) * 0.5 + bgGroup.position.y;
                        const mz = (starPositions[ia + 2] + starPositions[ib + 2]) * 0.5 + bgGroup.position.z;

                        const vx = mx - ro.x;
                        const vy = my - ro.y;
                        const vz = mz - ro.z;
                        const vLenSq = vx * vx + vy * vy + vz * vz;
                        const dot = vx * rd.x + vy * rd.y + vz * rd.z;
                        const distSq = Math.max(0, vLenSq - dot * dot);

                        if (distSq < rayRadiusSq) {
                            const t = 1 - Math.sqrt(distSq) / rayRadius;
                            const boost = 0.75 + t * (1.2 + hoverBoost * 1.0 + audioEnergy * 0.35);

                            network.focusPositions[ptr] = starPositions[ia];
                            network.focusPositions[ptr + 1] = starPositions[ia + 1];
                            network.focusPositions[ptr + 2] = starPositions[ia + 2];

                            network.focusPositions[ptr + 3] = starPositions[ib];
                            network.focusPositions[ptr + 4] = starPositions[ib + 1];
                            network.focusPositions[ptr + 5] = starPositions[ib + 2];

                            network.focusColors[ptr] = starColors[ia] * boost;
                            network.focusColors[ptr + 1] = starColors[ia + 1] * boost;
                            network.focusColors[ptr + 2] = starColors[ia + 2] * boost;
                            network.focusColors[ptr + 3] = starColors[ib] * boost;
                            network.focusColors[ptr + 4] = starColors[ib + 1] * boost;
                            network.focusColors[ptr + 5] = starColors[ib + 2] * boost;

                            ptr += 6;
                        }

                        checked += 1;
                    }

                    network.focusCursor = (start + 1) % edges.length;
                    network.focusGeometry.setDrawRange(0, (ptr / 3) | 0);
                    network.focusGeometry.attributes.position.needsUpdate = true;
                    network.focusGeometry.attributes.color.needsUpdate = true;
                    network.focusLines.material.opacity = 0.35 + hoverBoost * 0.38 + audioEnergy * 0.14;
                    if (network.staticLines) network.staticLines.material.opacity = 0.045 + hoverBoost * 0.045;
                }
            }

            if (ripples.length) {
                for (let i = ripples.length - 1; i >= 0; i--) {
                    const r = ripples[i];
                    const p = (performance.now() - r.start) / r.duration;
                    if (p >= 1) {
                        fgGroup.remove(r.mesh);
                        r.mesh.geometry.dispose();
                        r.mesh.material.dispose();
                        ripples.splice(i, 1);
                        continue;
                    }
                    const ease = 1 - Math.pow(1 - p, 3);
                    const s = 1 + ease * r.maxScale;
                    r.mesh.scale.set(s, s, s);
                    r.mesh.material.opacity = (1 - ease) * 0.65;
                }
            }

            clampZoomOffsets();
            const zoomAlpha = 1 - Math.exp(-zoomConfig.damping * dt);
            zoomState.currentOffsetZ += (zoomState.targetOffsetZ - zoomState.currentOffsetZ) * zoomAlpha;
            const cameraTargetZ = clamp(cameraBase.z + zoomState.currentOffsetZ, zoomConfig.minZ, zoomConfig.maxZ);
            zoomState.currentOffsetZ = cameraTargetZ - cameraBase.z;

            camera.position.x += (cameraBase.x + mouseX * 0.85 - camera.position.x) * 1.9 * dt;
            camera.position.y += (cameraBase.y + mouseY * 0.55 - camera.position.y) * 1.9 * dt;
            camera.position.z += (cameraTargetZ - camera.position.z) * 1.6 * dt;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }

        animate();

        // --- 响应窗口大小变化 ---
        window.addEventListener('resize', function () {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });

        const beatFlashEl = document.getElementById('beat-flash');
        function updateBeatFlashStyle() {
            if (!beatFlashEl) return;
            if (themeState.value) {
                beatFlashEl.style.background =
                    'radial-gradient(circle at 50% 50%, rgba(255, 61, 166, 0.18), rgba(255, 122, 24, 0.10), transparent 62%)';
            } else {
                beatFlashEl.style.background =
                    'radial-gradient(circle at 50% 50%, rgba(124, 172, 248, 0.20), rgba(79, 172, 254, 0.10), transparent 62%)';
            }
        }
        updateBeatFlashStyle();

        function flashBeat(intensity) {
            if (!beatFlashEl) return;
            const v = clamp(typeof intensity === 'number' ? intensity : 0.6, 0, 1);
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(beatFlashEl);
                gsap.set(beatFlashEl, { opacity: 0 });
                gsap.to(beatFlashEl, { opacity: 0.10 + v * 0.30, duration: 0.05, ease: 'power2.out' });
                gsap.to(beatFlashEl, { opacity: 0, duration: 0.45, ease: 'power2.out', delay: 0.06 });
            } else {
                beatFlashEl.style.opacity = String(0.10 + v * 0.30);
                setTimeout(function () {
                    beatFlashEl.style.opacity = '0';
                }, 120);
            }
        }

        window.SceneFX = {
            setTheme: function (mode) {
                const next = mode === 'neon' || mode === 1 || mode === true ? 1 : 0;
                applyThemeValue(next);
                updateBeatFlashStyle();
            },
            setAudioEnergy: function (value) {
                audioEnergy = clamp(value || 0, 0, 1);
            },
            beat: function (intensity) {
                flashBeat(intensity);
            },
            setZoomEnabled: function (enabled) {
                zoomState.enabled = enabled !== false;
            },
            setZoomConfig: function (partial) {
                if (!partial || typeof partial !== 'object') return;
                if (typeof partial.speed === 'number') zoomConfig.speed = partial.speed;
                if (typeof partial.minZ === 'number') zoomConfig.minZ = partial.minZ;
                if (typeof partial.maxZ === 'number') zoomConfig.maxZ = partial.maxZ;
                if (typeof partial.damping === 'number') zoomConfig.damping = partial.damping;
                clampZoomOffsets();
            },
            getState: function () {
                return {
                    theme: themeState.value ? 'neon' : 'default',
                    audioEnergy: audioEnergy,
                    network: networkEnabled,
                    zoom: {
                        enabled: zoomState.enabled,
                        minZ: zoomConfig.minZ,
                        maxZ: zoomConfig.maxZ,
                        damping: zoomConfig.damping,
                        speed: zoomConfig.speed,
                        currentZ: camera.position.z,
                    },
                };
            },
        };

        console.log(
            '✅ 3D 背景已初始化 (粒子: ' +
            starCount +
            ' + ' +
            ringCount +
            (networkEnabled ? ', 网络连线' : '') +
            ')'
        );
    }

    /* ================================================================
       鼠标尾迹特效 (Canvas 2D)
       ================================================================ */
    function initMouseTrail() {
        // 移动端不启用
        if (isMobileDevice || isSmallScreen) return;

        const trailCanvas = document.getElementById('mouse-trail');
        if (!trailCanvas) return;

        const ctx = trailCanvas.getContext('2d');
        trailCanvas.width = window.innerWidth;
        trailCanvas.height = window.innerHeight;

        const trailPoints = [];
        const maxTrailPoints = 38;
        let mouseActive = false;

        document.addEventListener('mousemove', function (e) {
            trailPoints.push({
                x: e.clientX,
                y: e.clientY,
                age: 0,
                maxAge: 0.7 + Math.random() * 0.5,
                size: 2.5 + Math.random() * 4,
            });
            if (trailPoints.length > maxTrailPoints) {
                trailPoints.shift();
            }
            mouseActive = true;
        });

        document.addEventListener('mouseleave', function () {
            mouseActive = false;
        });

        document.addEventListener('mouseenter', function () {
            mouseActive = true;
        });

        window.addEventListener('resize', function () {
            trailCanvas.width = window.innerWidth;
            trailCanvas.height = window.innerHeight;
        });

        function drawTrail() {
            ctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

            if (!mouseActive && trailPoints.length === 0) {
                requestAnimationFrame(drawTrail);
                return;
            }

            // 更新并绘制尾迹点
            for (let i = trailPoints.length - 1; i >= 0; i--) {
                const point = trailPoints[i];
                point.age += 0.016; // ~60fps
                if (point.age > point.maxAge) {
                    trailPoints.splice(i, 1);
                    continue;
                }
                const progress = point.age / point.maxAge;
                const alpha = 1 - progress;
                const size = point.size * (1 - progress * 0.7);

                // 发光光点
                const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 3);
                gradient.addColorStop(0, `rgba(160,200,255,${alpha * 0.9})`);
                gradient.addColorStop(0.35, `rgba(120,160,240,${alpha * 0.5})`);
                gradient.addColorStop(0.7, `rgba(80,120,220,${alpha * 0.15})`);
                gradient.addColorStop(1, 'rgba(60,80,180,0)');

                ctx.beginPath();
                ctx.fillStyle = gradient;
                ctx.arc(point.x, point.y, size * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // 如果鼠标不活跃且没有尾迹点，逐渐停止
            if (!mouseActive && trailPoints.length === 0) {
                // 继续循环但降低频率
            }

            requestAnimationFrame(drawTrail);
        }

        drawTrail();
        console.log('✅ 鼠标尾迹特效已初始化');
    }

    /* ================================================================
       滚动触发动画 (Intersection Observer + CSS 类)
       ================================================================ */
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-item');

        if (animatedElements.length === 0) return;

        if (isMobileDevice || isSmallScreen) {
            animatedElements.forEach(function (el) {
                el.classList.add('visible');
            });
            console.log('✅ 滚动动画已初始化 (移动端降级为直接显示, 元素: ' + animatedElements.length + ')');
            return;
        }

        document.documentElement.classList.add('js-fade-system');

        const config = {
            minMultiplier: 0.1,
            maxMultiplier: 2.0,
            idleMultiplier: 1.0,
            idleTimeoutMs: 260,
            deadZoneSpeedPxS: 60,
            speedMinPxS: 120,
            speedMaxPxS: 1500,
            speedEma: 0.22,
            multiplierResponse: 10,
            opacityResponse: 9,
            transformResponse: 10,
            enterOffsetY: 30,
            leaveOffsetY: 18,
            settleOpacityEps: 0.004,
            settleTransformEps: 0.25,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.15,
        };

        const elementState = new Map();
        const activeElements = new Set();

        let lastScrollY = window.scrollY || window.pageYOffset || 0;
        let scrollDirection = 1;

        window.addEventListener(
            'scroll',
            function () {
                const y = window.scrollY || window.pageYOffset || 0;
                scrollDirection = y >= lastScrollY ? 1 : -1;
                lastScrollY = y;
            },
            { passive: true }
        );

        let lastMouseX = 0;
        let lastMouseY = 0;
        let lastMouseTs = 0;
        let lastMouseMoveTs = 0;
        let speedPxS = 0;
        let targetMultiplier = config.idleMultiplier;
        let currentMultiplier = config.idleMultiplier;

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function mapSpeedToMultiplier(speedValuePxS) {
            const now = performance.now();
            if (now - lastMouseMoveTs > config.idleTimeoutMs) {
                return config.idleMultiplier;
            }

            if (speedValuePxS < config.deadZoneSpeedPxS) {
                return config.idleMultiplier;
            }

            const clampedSpeed = clamp(speedValuePxS, config.speedMinPxS, config.speedMaxPxS);
            const t = (clampedSpeed - config.speedMinPxS) / (config.speedMaxPxS - config.speedMinPxS);
            return config.minMultiplier + t * (config.maxMultiplier - config.minMultiplier);
        }

        window.addEventListener(
            'mousemove',
            function (e) {
                const now = performance.now();
                if (lastMouseTs > 0) {
                    const dtMs = now - lastMouseTs;
                    if (dtMs > 0) {
                        const dx = e.clientX - lastMouseX;
                        const dy = e.clientY - lastMouseY;
                        const dist = Math.hypot(dx, dy);
                        const instSpeed = (dist / dtMs) * 1000;
                        speedPxS = speedPxS + (instSpeed - speedPxS) * config.speedEma;
                        lastMouseMoveTs = now;
                        targetMultiplier = mapSpeedToMultiplier(speedPxS);
                    }
                } else {
                    lastMouseMoveTs = now;
                }
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                lastMouseTs = now;
            },
            { passive: true }
        );

        function ensureState(el) {
            const existing = elementState.get(el);
            if (existing) return existing;
            const st = {
                opacity: 0,
                y: config.enterOffsetY,
                targetOpacity: 0,
                targetY: config.enterOffsetY,
            };
            elementState.set(el, st);
            return st;
        }

        function setTargets(el, isInView) {
            const st = ensureState(el);
            st.targetOpacity = isInView ? 1 : 0;
            if (isInView) {
                st.targetY = 0;
            } else {
                st.targetY = scrollDirection === 1 ? -config.leaveOffsetY : config.leaveOffsetY;
            }
            activeElements.add(el);
        }

        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    setTargets(entry.target, entry.isIntersecting);
                });
            },
            {
                root: null,
                rootMargin: config.rootMargin,
                threshold: config.threshold,
            }
        );

        animatedElements.forEach(function (el) {
            ensureState(el);
            el.style.opacity = '0';
            el.style.transform = 'translate3d(0,' + config.enterOffsetY + 'px,0)';

            const rect = el.getBoundingClientRect();
            const isInViewNow = rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.12;
            setTargets(el, isInViewNow);
            observer.observe(el);
        });

        let overlayEl = null;
        let debugEnabled = false;
        let overlayEnabled = false;
        let enabled = true;
        let lastFrameTs = 0;
        let fps = 0;
        let fpsWindowStart = 0;
        let fpsFrames = 0;
        let lastUpdateCostMs = 0;

        function ensureOverlay() {
            if (overlayEl) return overlayEl;
            const el = document.createElement('div');
            el.style.position = 'fixed';
            el.style.right = '12px';
            el.style.bottom = '12px';
            el.style.zIndex = '99999';
            el.style.padding = '10px 12px';
            el.style.borderRadius = '12px';
            el.style.background = 'rgba(8, 10, 18, 0.78)';
            el.style.border = '1px solid rgba(255,255,255,0.12)';
            el.style.backdropFilter = 'blur(10px)';
            el.style.fontFamily = 'var(--font-mono)';
            el.style.fontSize = '12px';
            el.style.lineHeight = '1.5';
            el.style.color = 'rgba(232,236,242,0.95)';
            el.style.pointerEvents = 'none';
            el.style.whiteSpace = 'pre';
            document.body.appendChild(el);
            overlayEl = el;
            return el;
        }

        function updateOverlay() {
            if (!overlayEnabled) return;
            const el = ensureOverlay();
            el.textContent =
                'FadeSpeedSystem\n' +
                'fps: ' +
                fps.toFixed(0) +
                '\n' +
                'mouseSpeed(px/s): ' +
                speedPxS.toFixed(0) +
                '\n' +
                'multiplier: ' +
                currentMultiplier.toFixed(2) +
                '\n' +
                'active: ' +
                activeElements.size +
                '\n' +
                'update(ms): ' +
                lastUpdateCostMs.toFixed(2);
        }

        function disposeOverlay() {
            if (!overlayEl) return;
            overlayEl.remove();
            overlayEl = null;
        }

        window.FadeSpeedSystem = {
            enable: function (value) {
                enabled = value !== false;
            },
            setOverlay: function (value) {
                overlayEnabled = value === true;
                if (!overlayEnabled) disposeOverlay();
            },
            setDebug: function (value) {
                debugEnabled = value === true;
            },
            setConfig: function (partial) {
                if (!partial || typeof partial !== 'object') return;
                Object.keys(partial).forEach(function (key) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) {
                        config[key] = partial[key];
                    }
                });
            },
            getMetrics: function () {
                return {
                    fps: fps,
                    mouseSpeedPxS: speedPxS,
                    multiplier: currentMultiplier,
                    activeElements: activeElements.size,
                    lastUpdateCostMs: lastUpdateCostMs,
                    enabled: enabled,
                };
            },
        };

        function tick(ts) {
            if (!lastFrameTs) lastFrameTs = ts;
            const dt = Math.min((ts - lastFrameTs) / 1000, 0.05);
            lastFrameTs = ts;

            fpsFrames += 1;
            if (!fpsWindowStart) fpsWindowStart = ts;
            if (ts - fpsWindowStart >= 500) {
                fps = (fpsFrames * 1000) / (ts - fpsWindowStart);
                fpsFrames = 0;
                fpsWindowStart = ts;
            }

            const t0 = performance.now();

            targetMultiplier = mapSpeedToMultiplier(speedPxS);
            const multAlpha = 1 - Math.exp(-config.multiplierResponse * dt);
            currentMultiplier = currentMultiplier + (targetMultiplier - currentMultiplier) * multAlpha;

            if (enabled) {
                const opacityAlpha = 1 - Math.exp(-(config.opacityResponse * currentMultiplier) * dt);
                const transformAlpha = 1 - Math.exp(-(config.transformResponse * currentMultiplier) * dt);

                activeElements.forEach(function (el) {
                    const st = elementState.get(el);
                    if (!st) {
                        activeElements.delete(el);
                        return;
                    }

                    st.opacity = st.opacity + (st.targetOpacity - st.opacity) * opacityAlpha;
                    st.y = st.y + (st.targetY - st.y) * transformAlpha;

                    el.style.opacity = String(st.opacity);
                    el.style.transform = 'translate3d(0,' + st.y + 'px,0)';

                    const done =
                        Math.abs(st.targetOpacity - st.opacity) < config.settleOpacityEps &&
                        Math.abs(st.targetY - st.y) < config.settleTransformEps;

                    if (done) {
                        if (st.targetOpacity >= 0.999) {
                            el.style.opacity = '1';
                            el.style.transform = 'translate3d(0,0,0)';
                        } else if (st.targetOpacity <= 0.001) {
                            el.style.opacity = '0';
                        }
                        activeElements.delete(el);
                    }
                });
            }

            lastUpdateCostMs = performance.now() - t0;
            if (debugEnabled && lastUpdateCostMs > 8) {
                console.log('[FadeSpeedSystem] slow frame:', lastUpdateCostMs.toFixed(2) + 'ms', 'active:', activeElements.size);
            }

            updateOverlay();
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        console.log('✅ 滚动动画已初始化 (交互式淡入淡出：透明度速率跟随鼠标速度, 元素: ' + animatedElements.length + ')');
    }

    /* ================================================================
       背景音乐控制
       ================================================================ */
    function initMusicControl() {
        const audio = document.getElementById('bgMusic');
        const toggleBtn = document.getElementById('musicToggle');
        const iconOff = toggleBtn ? toggleBtn.querySelector('.music-icon-off') : null;
        const iconOn = toggleBtn ? toggleBtn.querySelector('.music-icon-on') : null;

        if (!audio || !toggleBtn) return;

        function getAudioSource() {
            const direct = audio.getAttribute('src');
            if (direct) return direct;
            const sourceEl = audio.querySelector('source');
            const fromSource = sourceEl ? sourceEl.getAttribute('src') : '';
            if (fromSource) return fromSource;
            return '';
        }

        function ensureLoaded() {
            const src = getAudioSource();
            if (!src) return false;
            if (!audio.currentSrc || audio.readyState === 0) {
                audio.load();
            }
            return true;
        }

        if (!getAudioSource()) {
            console.warn('⚠️ 未设置背景音乐文件路径：请在 HTML 的 bgMusic 元素上设置 src 或 <source src="...">');
        }

        if (window.location && window.location.protocol === 'file:') {
            console.warn('⚠️ 当前以 file:// 打开页面，部分浏览器可能阻止音频加载；建议用本地服务器方式打开');
        }

        if (typeof audio.volume === 'number') {
            audio.volume = 0.65;
        }

        let isPlaying = false;

        function updateUI() {
            if (isPlaying) {
                iconOff.style.display = 'none';
                iconOn.style.display = 'block';
                toggleBtn.classList.add('playing');
                toggleBtn.setAttribute('aria-label', '暂停背景音乐');
                toggleBtn.setAttribute('title', '暂停背景音乐');
            } else {
                iconOff.style.display = 'block';
                iconOn.style.display = 'none';
                toggleBtn.classList.remove('playing');
                toggleBtn.setAttribute('aria-label', '播放背景音乐');
                toggleBtn.setAttribute('title', '播放背景音乐');
            }
        }

        let lastPointerTs = 0;
        function handleToggle() {
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
            } else {
                if (!ensureLoaded()) {
                    console.warn('⚠️ 找不到可播放的音频源，请检查 xy.mp3 是否与 HTML 同目录');
                    isPlaying = false;
                    updateUI();
                    return;
                }
                audio.play().then(function () {
                    isPlaying = true;
                    updateUI();
                }).catch(function (err) {
                    console.warn('⚠️ 音频播放失败:', err && err.name ? err.name : 'UnknownError', err && err.message ? err.message : '');
                    // 即使播放失败也切换状态让用户知道
                    isPlaying = false;
                    updateUI();
                });
                return; // 等待 play() 的 promise 结果
            }
            updateUI();
        }

        function autoStart() {
            if (isPlaying) return;
            if (audio && !audio.paused && !audio.ended) return;
            if (!ensureLoaded()) return;
            audio.play().catch(function () {});
        }

        toggleBtn.addEventListener(
            'pointerdown',
            function (e) {
                lastPointerTs = performance.now();
                e.preventDefault();
                handleToggle();
            },
            { passive: false }
        );

        toggleBtn.addEventListener('click', function () {
            if (performance.now() - lastPointerTs < 500) return;
            handleToggle();
        });

        document.addEventListener(
            'pointerdown',
            function () {
                ensureLoaded();
                autoStart();
            },
            { passive: true, once: true }
        );

        // 音频自然结束时
        audio.addEventListener('ended', function () {
            isPlaying = false;
            updateUI();
        });

        // 音频播放成功时
        audio.addEventListener('play', function () {
            isPlaying = true;
            updateUI();
        });

        // 音频暂停时
        audio.addEventListener('pause', function () {
            isPlaying = false;
            updateUI();
        });

        audio.addEventListener('error', function () {
            const code = audio.error ? audio.error.code : 0;
            console.warn('⚠️ 音频加载失败 (code: ' + code + ')，请确认文件存在且浏览器支持该格式');
        });

        updateUI();
        console.log('✅ 音乐控制已初始化');
    }

    /* ================================================================
       顶部导航栏交互
       ================================================================ */
    function initNavigation() {
        const topNav = document.getElementById('topNav');
        const navDropdown = document.getElementById('navDropdown');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const dropdownToggle = navDropdown ? navDropdown.querySelector('.nav-dropdown-toggle') : null;

        // 滚动时导航栏样式变化
        let scrollTicking = false;
        window.addEventListener('scroll', function () {
            if (!scrollTicking) {
                requestAnimationFrame(function () {
                    if (window.scrollY > 40) {
                        topNav.classList.add('scrolled');
                    } else {
                        topNav.classList.remove('scrolled');
                    }
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        });

        // 下拉菜单切换
        if (dropdownToggle && dropdownMenu) {
            dropdownToggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                navDropdown.classList.toggle('open');
                const expanded = navDropdown.classList.contains('open');
                dropdownToggle.setAttribute('aria-expanded', expanded);
            });

            // 点击菜单项后关闭下拉
            dropdownMenu.querySelectorAll('.dropdown-link').forEach(function (link) {
                link.addEventListener('click', function () {
                    navDropdown.classList.remove('open');
                    dropdownToggle.setAttribute('aria-expanded', 'false');
                });
            });

            // 点击外部关闭下拉
            document.addEventListener('click', function (e) {
                if (!navDropdown.contains(e.target)) {
                    navDropdown.classList.remove('open');
                    if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // 平滑滚动（增强锚点跳转）
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navHeight = topNav ? topNav.offsetHeight : 60;
                    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 10;
                    window.scrollTo({
                        top: targetTop,
                        behavior: 'smooth',
                    });
                }
            });
        });

        console.log('✅ 导航交互已初始化');
    }

    function initProjectCardTilt() {
        if (isMobileDevice || isSmallScreen) return;

        const cards = document.querySelectorAll('.project-card');
        if (!cards || cards.length === 0) return;

        const maxTiltX = 10;
        const maxTiltY = 12;

        cards.forEach(function (card) {
            let rafId = 0;
            let pendingX = 0;
            let pendingY = 0;

            function apply() {
                rafId = 0;
                const rx = (-pendingY * maxTiltX).toFixed(2) + 'deg';
                const ry = (pendingX * maxTiltY).toFixed(2) + 'deg';
                const gx = ((pendingX + 0.5) * 100).toFixed(2) + '%';
                const gy = ((pendingY + 0.5) * 100).toFixed(2) + '%';
                card.style.setProperty('--tilt-rx', rx);
                card.style.setProperty('--tilt-ry', ry);
                card.style.setProperty('--glare-x', gx);
                card.style.setProperty('--glare-y', gy);
            }

            function scheduleApply() {
                if (rafId) return;
                rafId = requestAnimationFrame(apply);
            }

            card.addEventListener('mouseenter', function () {
                card.classList.add('is-tilting');
            });

            card.addEventListener('mouseleave', function () {
                card.classList.remove('is-tilting');
                card.style.setProperty('--tilt-rx', '0deg');
                card.style.setProperty('--tilt-ry', '0deg');
                card.style.setProperty('--glare-x', '50%');
                card.style.setProperty('--glare-y', '35%');
            });

            card.addEventListener(
                'mousemove',
                function (e) {
                    const rect = card.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    pendingX = Math.min(Math.max(x - 0.5, -0.5), 0.5);
                    pendingY = Math.min(Math.max(y - 0.5, -0.5), 0.5);
                    scheduleApply();
                },
                { passive: true }
            );
        });

        console.log('✅ 项目卡片倾斜跟随已初始化 (卡片数: ' + cards.length + ')');
    }

    function initThemeSystem() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        const storageKey = 'zh_theme';
        let mode = localStorage.getItem(storageKey) === 'neon' ? 'neon' : 'default';

        function apply(nextMode) {
            mode = nextMode === 'neon' ? 'neon' : 'default';
            document.body.classList.toggle('theme-neon', mode === 'neon');
            document.body.classList.toggle('theme-default', mode !== 'neon');
            btn.classList.toggle('is-neon', mode === 'neon');
            localStorage.setItem(storageKey, mode);
            if (window.SceneFX && typeof window.SceneFX.setTheme === 'function') {
                window.SceneFX.setTheme(mode);
            }
        }

        btn.addEventListener('click', function () {
            apply(mode === 'neon' ? 'default' : 'neon');
        });

        apply(mode);
        window.ThemeSystem = {
            getMode: function () {
                return mode;
            },
            setMode: function (nextMode) {
                apply(nextMode);
            },
        };
    }

    function initDynamicGradient() {
        const layer = document.getElementById('bg-gradient');
        if (!layer) return;

        let tx = 0;
        let ty = 0;
        let mx = 0;
        let my = 0;

        window.addEventListener(
            'mousemove',
            function (e) {
                const nx = (e.clientX / window.innerWidth) * 2 - 1;
                const ny = (e.clientY / window.innerHeight) * 2 - 1;
                tx = nx * 90;
                ty = ny * 70;
            },
            { passive: true }
        );

        function tick() {
            mx += (tx - mx) * 0.06;
            my += (ty - my) * 0.06;
            document.documentElement.style.setProperty('--bg-mx', mx.toFixed(2) + 'px');
            document.documentElement.style.setProperty('--bg-my', my.toFixed(2) + 'px');
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    function initTextDisintegration() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (typeof gsap.registerPlugin === 'function') {
            gsap.registerPlugin(ScrollTrigger);
        }

        const nodes = Array.from(document.querySelectorAll('.section-heading, .section-label')).filter(function (el) {
            const hero = document.getElementById('hero');
            return !(hero && hero.contains(el));
        });
        if (nodes.length === 0) return;

        function split(el) {
            if (el.dataset.splitDone === 'true') return;
            const text = el.textContent || '';
            el.textContent = '';
            const frag = document.createDocumentFragment();
            Array.from(text).forEach(function (ch) {
                const span = document.createElement('span');
                span.className = 'text-frag';
                span.textContent = ch === ' ' ? '\u00A0' : ch;
                frag.appendChild(span);
            });
            el.appendChild(frag);
            el.dataset.splitDone = 'true';
        }

        function rand(min, max) {
            return min + Math.random() * (max - min);
        }

        nodes.forEach(function (el) {
            split(el);
            const spans = Array.from(el.querySelectorAll('.text-frag'));
            if (spans.length === 0) return;

            ScrollTrigger.create({
                trigger: el.closest('.section') || el,
                start: 'top 80%',
                end: 'bottom 20%',
                onEnter: function () {
                    gsap.killTweensOf(spans);
                    gsap.fromTo(
                        spans,
                        {
                            opacity: 0,
                            x: function () {
                                return rand(-26, 26);
                            },
                            y: function () {
                                return rand(12, 34);
                            },
                            rotationZ: function () {
                                return rand(-10, 10);
                            },
                            filter: 'blur(2px)',
                        },
                        {
                            opacity: 1,
                            x: 0,
                            y: 0,
                            rotationZ: 0,
                            filter: 'blur(0px)',
                            duration: 0.75,
                            ease: 'power2.out',
                            stagger: { each: 0.012, from: 'random' },
                            overwrite: 'auto',
                        }
                    );
                },
                onEnterBack: function () {
                    gsap.killTweensOf(spans);
                    gsap.fromTo(
                        spans,
                        {
                            opacity: 0,
                            x: function () {
                                return rand(-26, 26);
                            },
                            y: function () {
                                return rand(-34, -12);
                            },
                            rotationZ: function () {
                                return rand(-10, 10);
                            },
                            filter: 'blur(2px)',
                        },
                        {
                            opacity: 1,
                            x: 0,
                            y: 0,
                            rotationZ: 0,
                            filter: 'blur(0px)',
                            duration: 0.75,
                            ease: 'power2.out',
                            stagger: { each: 0.012, from: 'random' },
                            overwrite: 'auto',
                        }
                    );
                },
                onLeave: function () {
                    gsap.killTweensOf(spans);
                    gsap.to(spans, {
                        opacity: 0,
                        x: function () {
                            return rand(-22, 22);
                        },
                        y: function () {
                            return rand(-28, -10);
                        },
                        rotationZ: function () {
                            return rand(-14, 14);
                        },
                        filter: 'blur(2px)',
                        duration: 0.5,
                        ease: 'power2.inOut',
                        stagger: { each: 0.01, from: 'random' },
                        overwrite: 'auto',
                    });
                },
                onLeaveBack: function () {
                    gsap.killTweensOf(spans);
                    gsap.to(spans, {
                        opacity: 0,
                        x: function () {
                            return rand(-22, 22);
                        },
                        y: function () {
                            return rand(10, 28);
                        },
                        rotationZ: function () {
                            return rand(-14, 14);
                        },
                        filter: 'blur(2px)',
                        duration: 0.5,
                        ease: 'power2.inOut',
                        stagger: { each: 0.01, from: 'random' },
                        overwrite: 'auto',
                    });
                },
            });
        });
    }

    function initAudioReactive() {
        const audio = document.getElementById('bgMusic');
        if (!audio) return;

        audio.crossOrigin = 'anonymous';

        const fileProtocol = window.location && window.location.protocol === 'file:';

        let ctx = null;
        let analyser = null;
        let source = null;
        let freq = null;
        let running = false;
        let bassEma = 0;
        let energy = 0;
        let lastBeatTs = 0;
        let fallback = fileProtocol;
        let warned = false;

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function setup() {
            if (fallback) return;
            if (ctx) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.65;
            try {
                source = ctx.createMediaElementSource(audio);
            } catch (e) {
                fallback = true;
                analyser = null;
                source = null;
                freq = null;
                return;
            }
            source.connect(analyser);
            analyser.connect(ctx.destination);
            freq = new Uint8Array(analyser.frequencyBinCount);
        }

        function sendEnergy(value) {
            if (window.SceneFX && typeof window.SceneFX.setAudioEnergy === 'function') {
                window.SceneFX.setAudioEnergy(value);
            }
        }

        function sendBeat(intensity) {
            if (window.SceneFX && typeof window.SceneFX.beat === 'function') {
                window.SceneFX.beat(intensity);
            }
        }

        function loop() {
            if (!running) return;

            if (fallback || !analyser || !freq) {
                if (!warned) {
                    warned = true;
                    console.warn('⚠️ 音频频谱分析在 file:// 下会被浏览器限制；请用 http://localhost 打开页面以启用真实音频可视化');
                }

                const t = typeof audio.currentTime === 'number' ? audio.currentTime : 0;
                const base = 0.28 + 0.18 * Math.sin(t * 2.1) + 0.12 * Math.sin(t * 5.4);
                const target = clamp(base, 0, 1);
                energy += (target - energy) * 0.14;
                sendEnergy(energy);

                const now = performance.now();
                if (now - lastBeatTs > 520) {
                    lastBeatTs = now;
                    sendBeat(0.35 + 0.25 * Math.abs(Math.sin(t * 1.35)));
                }

                requestAnimationFrame(loop);
                return;
            }

            analyser.getByteFrequencyData(freq);

            const bassBins = Math.min(18, freq.length);
            let bass = 0;
            for (let i = 0; i < bassBins; i++) bass += freq[i];
            bass = bass / (bassBins * 255);

            bassEma += (bass - bassEma) * 0.1;
            const transient = clamp((bass - bassEma) * 4.2, 0, 1);
            const target = clamp(bass * 1.45 + transient * 0.7, 0, 1);
            energy += (target - energy) * 0.28;

            sendEnergy(energy);

            const now = performance.now();
            if (transient > 0.3 && now - lastBeatTs > 200) {
                lastBeatTs = now;
                sendBeat(transient);
            }

            requestAnimationFrame(loop);
        }

        audio.addEventListener('play', function () {
            setup();
            if (ctx && typeof ctx.resume === 'function') ctx.resume();
            running = true;
            requestAnimationFrame(loop);
        });

        audio.addEventListener('pause', function () {
            running = false;
            sendEnergy(0);
        });

        audio.addEventListener('ended', function () {
            running = false;
            sendEnergy(0);
        });
    }

    /* ================================================================
       键盘导航支持
       ================================================================ */
    function initKeyboardNavigation() {
        const sections = document.querySelectorAll('.section');
        if (sections.length === 0) return;

        let currentSectionIndex = 0;
        let keyThrottle = false;

        window.addEventListener('keydown', function (e) {
            if (keyThrottle) return;

            // 如果焦点在输入框内，不拦截
            const activeTag = document.activeElement.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                keyThrottle = true;
                setTimeout(function () {
                    keyThrottle = false;
                }, 400);

                // 找到当前可见的区块
                const navHeight = document.getElementById('topNav') ?
                    document.getElementById('topNav').offsetHeight : 60;
                const scrollTop = window.pageYOffset + navHeight + 20;

                if (e.key === 'ArrowDown') {
                    // 向下滚动到下一个区块
                    for (let i = 0; i < sections.length; i++) {
                        const sectionTop = sections[i].getBoundingClientRect().top + window.pageYOffset;
                        if (sectionTop > scrollTop) {
                            window.scrollTo({ top: sectionTop - navHeight - 10, behavior: 'smooth' });
                            break;
                        }
                    }
                } else if (e.key === 'ArrowUp') {
                    // 向上滚动到上一个区块
                    for (let i = sections.length - 1; i >= 0; i--) {
                        const sectionTop = sections[i].getBoundingClientRect().top + window.pageYOffset;
                        if (sectionTop < scrollTop - 60) {
                            window.scrollTo({ top: sectionTop - navHeight - 10, behavior: 'smooth' });
                            break;
                        }
                    }
                }
            }

            // Home 键回到顶部
            if (e.key === 'Home') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // End 键到达底部
            if (e.key === 'End') {
                e.preventDefault();
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
        });

        console.log('✅ 键盘导航已初始化 (↑↓ Home End)');
    }

    function initHeroTypewriter() {
        const heroGreetingText = document.getElementById('heroGreetingText');
        const heroGreetingCaret = document.getElementById('heroGreetingCaret');
        const heroTitlePrefix = document.getElementById('heroTitlePrefix');
        const heroTitleName = document.getElementById('heroTitleName');
        const heroTitleCaret = document.getElementById('heroTitleCaret');
        const heroSubtitleText = document.getElementById('heroSubtitleText');
        const heroSubtitleCaret = document.getElementById('heroSubtitleCaret');
        const heroDescText = document.getElementById('heroDescText');
        const heroDescCaret = document.getElementById('heroDescCaret');
        const heroCtaPrimaryText = document.getElementById('heroCtaPrimaryText');
        const heroCtaPrimaryCaret = document.getElementById('heroCtaPrimaryCaret');
        const heroCtaSecondaryText = document.getElementById('heroCtaSecondaryText');
        const heroCtaSecondaryCaret = document.getElementById('heroCtaSecondaryCaret');
        const heroScrollText = document.getElementById('heroScrollText');
        const heroScrollCaret = document.getElementById('heroScrollCaret');
        const signatureLabel = document.getElementById('signatureLabel');
        const signatureText = document.getElementById('signatureText');
        const signatureCaret = document.getElementById('signatureCaret');

        if (
            !heroGreetingText ||
            !heroTitlePrefix ||
            !heroTitleName ||
            !heroSubtitleText ||
            !heroDescText ||
            !heroCtaPrimaryText ||
            !heroCtaSecondaryText ||
            !heroScrollText ||
            !signatureLabel ||
            !signatureText
        ) {
            return;
        }

        function setCaretActive(caretEl, active) {
            if (!caretEl) return;
            if (active) {
                caretEl.classList.add('is-active');
            } else {
                caretEl.classList.remove('is-active');
            }
        }

        function typeInto(el, caretEl, text, options) {
            const cfg = options || {};
            const baseSpeed = typeof cfg.speed === 'number' ? cfg.speed : 60;
            const randomJitter = typeof cfg.jitter === 'number' ? cfg.jitter : 35;
            const chars = Array.from(text);

            el.textContent = '';
            setCaretActive(caretEl, true);

            return new Promise(function (resolve) {
                let i = 0;
                function step() {
                    i += 1;
                    el.textContent = chars.slice(0, i).join('');
                    if (i >= chars.length) {
                        setCaretActive(caretEl, false);
                        resolve();
                        return;
                    }
                    setTimeout(step, baseSpeed + Math.random() * randomJitter);
                }
                step();
            });
        }

        function startSignatureLoop() {
            const quotes = [
                '星星之火，可以燎原。',
                '为人民服务。',
                '自力更生，艰苦奋斗。',
                '没有调查，就没有发言权。',
                '实事求是。',
                '世上无难事，只要肯登攀。',
            ];

            const typeSpeed = 70;
            const deleteSpeed = 38;
            const pauseAfterType = 1600;
            const pauseAfterDelete = 450;

            let currentIndex = -1;
            let charIndex = 0;
            let isDeleting = false;

            function pickNextIndex() {
                if (quotes.length <= 1) return 0;
                let next = currentIndex;
                while (next === currentIndex) {
                    next = Math.floor(Math.random() * quotes.length);
                }
                return next;
            }

            function tick() {
                const fullText = quotes[currentIndex] || '';

                setCaretActive(signatureCaret, true);

                if (!isDeleting) {
                    charIndex = Math.min(charIndex + 1, fullText.length);
                    signatureText.textContent = fullText.slice(0, charIndex);
                    if (charIndex >= fullText.length) {
                        isDeleting = true;
                        setTimeout(tick, pauseAfterType);
                        return;
                    }
                    setTimeout(tick, typeSpeed + Math.random() * 40);
                    return;
                }

                charIndex = Math.max(charIndex - 1, 0);
                signatureText.textContent = fullText.slice(0, charIndex);
                if (charIndex <= 0) {
                    isDeleting = false;
                    currentIndex = pickNextIndex();
                    setTimeout(tick, pauseAfterDelete);
                    return;
                }
                setTimeout(tick, deleteSpeed + Math.random() * 25);
            }

            currentIndex = pickNextIndex();
            tick();
        }

        const content = {
            greeting: '👋 你好，很高兴遇见你',
            titlePrefix: '我是 ',
            titleName: '周辉',
            subtitle: '嵌入式软件工程师 · 编程爱好者 · 理想主义者\n对世界保持好奇',
            desc: '对新技术充满好奇，与探索欲望。善于接收学习新事物；',
            ctaPrimary: '查看技术栈与成长',
            ctaSecondary: '与我联系',
            scroll: '滚动查看更多',
            signatureLabel: '个性签名：',
        };

        Promise.resolve()
            .then(function () {
                return typeInto(heroGreetingText, heroGreetingCaret, content.greeting, { speed: 55, jitter: 40 });
            })
            .then(function () {
                heroTitlePrefix.textContent = '';
                heroTitleName.textContent = '';
                setCaretActive(heroTitleCaret, true);
                return typeInto(heroTitlePrefix, heroTitleCaret, content.titlePrefix, { speed: 55, jitter: 35 }).then(function () {
                    return typeInto(heroTitleName, heroTitleCaret, content.titleName, { speed: 70, jitter: 40 });
                }).then(function () {
                    setCaretActive(heroTitleCaret, false);
                    if (!isMobileDevice && !isSmallScreen) {
                        heroTitleName.classList.add('glitch');
                        heroTitleName.setAttribute('data-text', content.titleName);
                    }
                });
            })
            .then(function () {
                return typeInto(heroSubtitleText, heroSubtitleCaret, content.subtitle, { speed: 30, jitter: 25 });
            })
            .then(function () {
                return typeInto(heroDescText, heroDescCaret, content.desc, { speed: 38, jitter: 28 });
            })
            .then(function () {
                return typeInto(heroCtaPrimaryText, heroCtaPrimaryCaret, content.ctaPrimary, { speed: 45, jitter: 30 });
            })
            .then(function () {
                return typeInto(heroCtaSecondaryText, heroCtaSecondaryCaret, content.ctaSecondary, { speed: 45, jitter: 30 });
            })
            .then(function () {
                return typeInto(heroScrollText, heroScrollCaret, content.scroll, { speed: 35, jitter: 25 });
            })
            .then(function () {
                return typeInto(signatureLabel, signatureCaret, content.signatureLabel, { speed: 45, jitter: 25 });
            })
            .then(function () {
                startSignatureLoop();
            });
    }

    /* ================================================================
       页脚年份自动更新
       ================================================================ */
    function updateFooterYear() {
        const yearSpan = document.getElementById('currentYear');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    function initBlock5Timeline() {
        const skillCards = Array.from(document.querySelectorAll('.block5-skill-card'));
        for (let i = 0; i < skillCards.length; i++) {
            const raw = skillCards[i].getAttribute('data-p');
            const p = raw ? Math.max(0, Math.min(100, parseInt(raw, 10) || 0)) : 0;
            skillCards[i].style.setProperty('--p', String(p));
        }

        const items = Array.from(document.querySelectorAll('.block5-timeline-item'));
        const nodes = Array.from(document.querySelectorAll('.block5-timeline-node'));
        if (!items.length && !skillCards.length) return;

        if (items.length) {
            for (let i = 0; i < items.length; i++) {
                items[i].style.setProperty('--block5-delay', i * 100 + 'ms');
            }

            if ('IntersectionObserver' in window) {
                let remaining = items.length;
                const observer = new IntersectionObserver(
                    function (entries) {
                        for (let i = 0; i < entries.length; i++) {
                            const entry = entries[i];
                            if (!entry.isIntersecting) continue;
                            entry.target.classList.add('block5-in');
                            observer.unobserve(entry.target);
                            remaining -= 1;
                        }
                        if (remaining <= 0) observer.disconnect();
                    },
                    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
                );

                for (let i = 0; i < items.length; i++) {
                    observer.observe(items[i]);
                }
            } else {
                for (let i = 0; i < items.length; i++) {
                    items[i].classList.add('block5-in');
                }
            }
        }

        if (!nodes.length) return;

        function closeItem(item) {
            if (!item) return;
            const btn = item.querySelector('.block5-timeline-node');
            const drawer = btn ? document.getElementById(btn.getAttribute('aria-controls') || '') : null;
            item.classList.remove('block5-open');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (!drawer) return;
            const existing = drawer.dataset.block5CloseTimer ? parseInt(drawer.dataset.block5CloseTimer, 10) : 0;
            if (existing) clearTimeout(existing);
            const t = window.setTimeout(function () {
                drawer.hidden = true;
                drawer.removeAttribute('data-block5-close-timer');
            }, 360);
            drawer.dataset.block5CloseTimer = String(t);
        }

        function openItem(item) {
            if (!item) return;
            const btn = item.querySelector('.block5-timeline-node');
            const drawer = btn ? document.getElementById(btn.getAttribute('aria-controls') || '') : null;
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (drawer) {
                const existing = drawer.dataset.block5CloseTimer ? parseInt(drawer.dataset.block5CloseTimer, 10) : 0;
                if (existing) clearTimeout(existing);
                drawer.hidden = false;
            }
            requestAnimationFrame(function () {
                item.classList.add('block5-open');
            });
        }

        for (let i = 0; i < nodes.length; i++) {
            nodes[i].addEventListener('click', function (e) {
                const btn = e.currentTarget;
                const item = btn.closest('.block5-timeline-item');
                if (!item) return;
                const isOpen = item.classList.contains('block5-open');
                for (let j = 0; j < items.length; j++) {
                    if (items[j] !== item) closeItem(items[j]);
                }
                if (isOpen) {
                    closeItem(item);
                } else {
                    openItem(item);
                }
            });
        }
    }

    /* ================================================================
       初始化入口
       ================================================================ */
    function init() {
        console.log('🚀 个人主页初始化开始...');
        console.log('📍 设备检测: ' + (isMobileDevice ? '移动设备' : '桌面设备') +
            ', 屏幕宽度: ' + window.innerWidth + 'px');

        updateFooterYear();
        initThemeSystem();
        initDynamicGradient();
        initHeroTypewriter();
        initThreeJSBackground();
        initMouseTrail();
        initScrollAnimations();
        initBlock5Timeline();
        initMusicControl();
        initNavigation();
        initProjectCardTilt();
        initTextDisintegration();
        initAudioReactive();
        initKeyboardNavigation();

        console.log('✅ 所有模块初始化完成！');
        console.log('💡 提示：请替换音频文件路径、移动版URL、项目链接等占位内容。');
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

