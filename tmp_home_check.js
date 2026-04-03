
        // --- THREE.JS SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#2b1d33'); // Soft twilight purple/pink
        scene.fog = new THREE.FogExp2('#2b1d33', 0.012); // Slightly less dense twilight fog

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        // Position camera to look down at an angle (Isometric-ish)
        camera.position.set(0, 60, 60); 
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding; // Better color rendering
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        // --- LIGHTING ---
        // Hemisphere light makes colors look natural (Sky color, Ground color, Intensity)
        const hemiLight = new THREE.HemisphereLight(0xffb3b3, 0x2e4024, 0.7); 
        scene.add(hemiLight);

        // Sunset Directional Light (The "Sun")
        const sunLight = new THREE.DirectionalLight(0xffaa44, 1.2); // Golden hour sun
        sunLight.position.set(-60, 30, -30); // Low angle for long shadows
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.001; // Prevents shadow artifacts
        scene.add(sunLight);

        // --- TERRAIN ---
        const groundGeo = new THREE.PlaneGeometry(300, 300);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x2d4c1e, // Natural dark forest green
            roughness: 1.0,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // --- THE WINDING PATH ---
        // Define exact points for the S-curve path
        const pathPoints = [
            new THREE.Vector3(-60, 0.5, 80),
            new THREE.Vector3(-20, 0.5, 60),
            new THREE.Vector3(30, 0.5, 50),
            new THREE.Vector3(50, 0.5, 10),
            new THREE.Vector3(20, 0.5, -20),
            new THREE.Vector3(-30, 0.5, -10),
            new THREE.Vector3(-50, 0.5, -40),
            new THREE.Vector3(-10, 0.5, -70),
            new THREE.Vector3(40, 0.5, -60),
            new THREE.Vector3(70, 0.5, -90)
        ];
        
        const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
        
        // Create actual visible path geometry
        const pathGeo = new THREE.TubeGeometry(pathCurve, 100, 3, 8, false);
        const pathMat = new THREE.MeshStandardMaterial({ 
            color: 0x6b4a31, // Distinct dirt brown
            roughness: 1,
        });
        const pathMesh = new THREE.Mesh(pathGeo, pathMat);
        pathMesh.receiveShadow = true;
        // Flatten the tube to look like a flat dirt road
        pathMesh.scale.y = 0.2; 
        scene.add(pathMesh);

        // Path Glow Edge (Magic dust) - Position Fixed!
        // We create a slightly thicker tube instead of scaling the old one from center
        const pathGlowGeo = new THREE.TubeGeometry(pathCurve, 100, 3.2, 8, false);
        const pathGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.15 });
        const pathGlow = new THREE.Mesh(pathGlowGeo, pathGlowMat);
        pathGlow.scale.y = 0.2; // Flatten exactly like the main path so it aligns perfectly
        scene.add(pathGlow);

        // --- LEVEL NODES (Exact placement on path) ---
        const LEVEL1_COMPLETE_KEY = 'missiongame_level1_completed_v1';
        const PLAYER_NAME_KEY = 'missiongame_player_name_v1';
        const totalLevels = 12;
        const unlockedLevels = localStorage.getItem(LEVEL1_COMPLETE_KEY) === 'true' ? 2 : 1;
        const currentLevel = unlockedLevels;
        const levelNodes = [];
        const uiLayer = document.getElementById('ui-layer');
        const profileBtn = document.getElementById('profileBtn');
        const infoModal = document.getElementById('infoModal');
        const infoModalTitle = document.getElementById('infoModalTitle');
        const infoModalText = document.getElementById('infoModalText');
        const infoOkBtn = document.getElementById('infoOkBtn');
        const profileModal = document.getElementById('profileModal');
        const profileNameInput = document.getElementById('profileNameInput');
        const profileCancelBtn = document.getElementById('profileCancelBtn');
        const profileSaveBtn = document.getElementById('profileSaveBtn');

        function getPlayerName() {
            const saved = localStorage.getItem(PLAYER_NAME_KEY);
            if (saved && saved.trim()) return saved.trim();
            return 'John Doe';
        }

        function showInfoModal(message, title = 'Notice') {
            infoModalTitle.textContent = title;
            infoModalText.textContent = message;
            infoModal.classList.add('show');
        }

        function closeInfoModal() {
            infoModal.classList.remove('show');
        }

        const nodeGeo = new THREE.CylinderGeometry(2, 2, 1, 16);
        const openMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x883300, emissiveIntensity: 0.5 }); // Orange
        const currentMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x886600, emissiveIntensity: 0.8 }); // Gold
        const lockedMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
        pathGlowMat.opacity = unlockedLevels >= 2 ? 0.22 : 0.1;

        for (let i = 0; i < totalLevels; i++) {
            // Get exact point along the curve (fraction from 0 to 1)
            const fraction = i / (totalLevels - 1);
            const position = pathCurve.getPointAt(fraction);
            
            const levelNo = i + 1;
            const isUnlocked = levelNo <= unlockedLevels;
            const isCurrent = levelNo === currentLevel;

            let mat = lockedMat;
            if (isUnlocked) mat = isCurrent ? currentMat : openMat;

            const node = new THREE.Mesh(nodeGeo, mat);
            node.position.set(position.x, 1, position.z);
            node.receiveShadow = true;
            node.castShadow = true;
            node.userData.level = levelNo;
            node.userData.isUnlocked = isUnlocked;
            scene.add(node);
            
            // Add point light to make nodes glow
            if (isUnlocked) {
                const color = isCurrent ? 0xfbbf24 : 0xf97316;
                const light = new THREE.PointLight(color, isCurrent ? 2 : 1, 15);
                light.position.set(position.x, 3, position.z);
                scene.add(light);
            }

            levelNodes.push({ mesh: node, number: levelNo, isCurrent, isUnlocked });

            // Create HTML Label
            const label = document.createElement('div');
            label.className = `level-label font-game ${isUnlocked ? 'label-open' : 'label-locked'}`;
            label.innerText = levelNo;
            label.id = `label-${i}`;
            uiLayer.appendChild(label);
        }

        // --- AVATAR (JOHN DOE) ON CURRENT LEVEL ---
        let avatarMesh;
        const avatarLevelNode = levelNodes[currentLevel - 1].mesh;
        
        // Create floating diamond shape for avatar
        const avatarGeo = new THREE.OctahedronGeometry(1.5, 0);
        const avatarMat = new THREE.MeshStandardMaterial({ 
            color: 0xffe4b5, 
            emissive: 0xf59e0b,
            emissiveIntensity: 0.5,
            wireframe: true
        });
        avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
        avatarMesh.position.set(avatarLevelNode.position.x, 6, avatarLevelNode.position.z);
        scene.add(avatarMesh);

        const avatarLabel = document.createElement('div');
        avatarLabel.className = 'avatar-label';
        avatarLabel.innerText = `${getPlayerName()} 💀`;
        uiLayer.appendChild(avatarLabel);

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileNameInput.value = getPlayerName();
            profileModal.classList.add('show');
            setTimeout(() => profileNameInput.focus(), 0);
        });

        infoOkBtn.addEventListener('click', closeInfoModal);
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) closeInfoModal();
        });

        profileCancelBtn.addEventListener('click', () => {
            profileModal.classList.remove('show');
        });

        profileSaveBtn.addEventListener('click', () => {
            const cleaned = profileNameInput.value.trim();
            if (!cleaned) {
                showInfoModal('Name cannot be empty.', 'Profile');
                return;
            }
            localStorage.setItem(PLAYER_NAME_KEY, cleaned);
            avatarLabel.innerText = `${cleaned} 💀`;
            profileModal.classList.remove('show');
        });

        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('show');
            }
        });

        // --- ENVIRONMENT GENERATOR (No overlapping with path) ---
        const trees = new THREE.Group();
        const rocks = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 5);
        const leavesGeo = new THREE.ConeGeometry(2.5, 6, 5);
        const rockGeo = new THREE.DodecahedronGeometry(1.5);
        
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3219 }); // Wood brown
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1e5928, roughness: 0.9 }); // Visible rich green
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 }); // Natural slate grey

        // Helper to check distance from path
        function isSafeFromPath(x, z, minDistance) {
            const checkPoint = new THREE.Vector3(x, 0, z);
            // Check distance against path points
            for (let i = 0; i <= 100; i++) {
                const pathPt = pathCurve.getPointAt(i / 100);
                if (checkPoint.distanceTo(pathPt) < minDistance) return false;
            }
            return true;
        }

        // Generate Trees
        for (let i = 0; i < 150; i++) {
            const x = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 200;
            
            if (isSafeFromPath(x, z, 8)) {
                const tree = new THREE.Group();
                
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                trunk.position.y = 1.5;
                trunk.castShadow = true;
                
                const leaves = new THREE.Mesh(leavesGeo, leavesMat);
                leaves.position.y = 5;
                leaves.castShadow = true;
                
                tree.add(trunk);
                tree.add(leaves);
                
                // Random scale and rotation
                const scale = 0.6 + Math.random() * 0.8;
                tree.scale.set(scale, scale, scale);
                tree.rotation.y = Math.random() * Math.PI;
                tree.position.set(x, 0, z);
                
                trees.add(tree);
            }
        }
        scene.add(trees);

        // Generate Rocks
        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            
            if (isSafeFromPath(x, z, 5)) {
                const rock = new THREE.Mesh(rockGeo, rockMat);
                rock.position.set(x, 0.5, z);
                
                const scale = 0.5 + Math.random() * 1.5;
                rock.scale.set(scale, scale * 0.7, scale);
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.castShadow = true;
                
                rocks.add(rock);
            }
        }
        scene.add(rocks);

        // --- FIREFLIES/POLLEN (Particle System) ---
        const fireflyCount = 100;
        const fireflyGeo = new THREE.BufferGeometry();
        const fireflyPos = new Float32Array(fireflyCount * 3);
        const fireflyOffsets = new Float32Array(fireflyCount); // For animation phasing

        for(let i=0; i<fireflyCount*3; i+=3) {
            fireflyPos[i] = (Math.random() - 0.5) * 150; // x
            fireflyPos[i+1] = 1 + Math.random() * 8; // y
            fireflyPos[i+2] = (Math.random() - 0.5) * 150; // z
            fireflyOffsets[i/3] = Math.random() * Math.PI * 2;
        }
        fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
        fireflyGeo.setAttribute('offset', new THREE.BufferAttribute(fireflyOffsets, 1));

        const fireflyMat = new THREE.PointsMaterial({
            color: 0xffd700, // Golden pollen for sunset
            size: 0.8,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
        scene.add(fireflies);

        // --- CUSTOM CAMERA PANNING (DRAG TO MOVE) ---
        // Start camera near Level 1
        const startNode = levelNodes[0].mesh.position;
        camera.position.x = startNode.x;
        camera.position.z = startNode.z + 50;
        camera.lookAt(startNode.x, 0, startNode.z);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let isDragging = false;
        let dragDistance = 0;
        let previousMousePosition = { x: 0, y: 0 };
        const isInsideShell = window.parent && window.parent !== window;
        
        // Pan speed multiplier
        const panSpeed = 0.15;

        function requestFullscreenAndLandscape() {
            if (isInsideShell) {
                window.parent.postMessage({ type: 'missiongame:request-fullscreen' }, '*');
                return;
            }

            (async () => {
                try {
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                    }
                } catch (_) {
                    // Fullscreen can fail silently on some browsers.
                }

                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(() => {});
                }
            })();
        }

        function navigateTo(page) {
            if (isInsideShell) {
                window.parent.postMessage({ type: 'missiongame:navigate', page }, '*');
                return;
            }

            if (page === 'level1') window.location.href = 'level1.html';
            else if (page === 'level2') window.location.href = 'level2.html';
            else window.location.href = 'index.html';
        }

        function handleNodeTap(clientX, clientY) {
            pointer.x = (clientX / window.innerWidth) * 2 - 1;
            pointer.y = -(clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);

            const intersections = raycaster.intersectObjects(levelNodes.map((n) => n.mesh), false);
            if (!intersections.length) return;

            const tappedLevel = intersections[0].object.userData.level;
            if (tappedLevel === 1) {
                navigateTo('level1');
                return;
            }

            if (tappedLevel === 2) {
                if (unlockedLevels >= 2) {
                    navigateTo('level2');
                } else {
                    showInfoModal('Level 2 is locked. Complete Level 1 first.', 'Level Locked');
                }
                return;
            }

            showInfoModal(`Level ${tappedLevel} is currently locked and coming soon.`, 'Level Locked');
        }

        function onDown(x, y) {
            isDragging = true;
            dragDistance = 0;
            previousMousePosition = { x, y };
            document.body.style.cursor = 'grabbing';
        }

        function onMove(x, y) {
            if (isDragging) {
                const deltaMove = {
                    x: x - previousMousePosition.x,
                    y: y - previousMousePosition.y
                };
                dragDistance += Math.abs(deltaMove.x) + Math.abs(deltaMove.y);

                // Move camera X and Z based on mouse movement
                // Because camera is angled, moving mouse Y moves camera Z
                camera.position.x -= deltaMove.x * panSpeed;
                camera.position.z -= deltaMove.y * panSpeed;

                // Simple boundaries to not get lost
                camera.position.x = Math.max(-80, Math.min(100, camera.position.x));
                camera.position.z = Math.max(-80, Math.min(120, camera.position.z));

                previousMousePosition = { x, y };
            }
        }

        function onUp(x, y) {
            isDragging = false;
            document.body.style.cursor = 'default';
            if (dragDistance < 8) {
                handleNodeTap(x, y);
            }
        }

        // Mouse Events
        window.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', (e) => onUp(e.clientX, e.clientY));
        window.addEventListener('mouseleave', () => { isDragging = false; document.body.style.cursor = 'default'; });

        // Touch Events
        window.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY));
        window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY));
        window.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            onUp(t.clientX, t.clientY);
        });

        // Tap anywhere -> fullscreen request
        window.addEventListener('pointerdown', requestFullscreenAndLandscape, { passive: true });

        // --- WINDOW RESIZE ---
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // --- UPDATE HTML OVERLAYS ---
        // This maps 3D positions to 2D screen CSS coordinates
        function updateUIPositions() {
            const widthHalf = window.innerWidth / 2;
            const heightHalf = window.innerHeight / 2;

            levelNodes.forEach((nodeObj, index) => {
                // Clone position and shift slightly up for text
                const pos = nodeObj.mesh.position.clone();
                pos.y += 1.5; 
                pos.project(camera);

                const label = document.getElementById(`label-${index}`);
                
                // Hide label if it's behind the camera
                if (pos.z > 1) {
                    label.style.display = 'none';
                    return;
                }
                
                label.style.display = 'block';
                label.style.left = (pos.x * widthHalf) + widthHalf + 'px';
                label.style.top = -(pos.y * heightHalf) + heightHalf + 'px';
            });

            // Avatar label update
            const avatarPos = avatarMesh.position.clone();
            avatarPos.y += 2; // Above the crystal
            avatarPos.project(camera);
            if (avatarPos.z <= 1) {
                avatarLabel.style.display = 'block';
                avatarLabel.style.left = (avatarPos.x * widthHalf) + widthHalf + 'px';
                avatarLabel.style.top = -(avatarPos.y * heightHalf) + heightHalf + 'px';
            } else {
                avatarLabel.style.display = 'none';
            }
        }

        // --- ANIMATION LOOP ---
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // Animate Avatar Crystal (Float and Spin)
            avatarMesh.rotation.y += 0.02;
            avatarMesh.position.y = 5 + Math.sin(time * 3) * 0.5;

            // Animate Fireflies
            const positions = fireflies.geometry.attributes.position.array;
            const offsets = fireflies.geometry.attributes.offset.array;
            
            for(let i=0; i<fireflyCount; i++) {
                // Bob up and down
                positions[i*3 + 1] += Math.sin(time * 2 + offsets[i]) * 0.02;
            }
            fireflies.geometry.attributes.position.needsUpdate = true;
            
            // Pulse current level node
            const currentMat = levelNodes[currentLevel-1].mesh.material;
            currentMat.emissiveIntensity = 0.5 + Math.abs(Math.sin(time * 4)) * 0.5;

            // Update HTML positions
            updateUIPositions();

            renderer.render(scene, camera);
        }

        // Start animation and remove loader
        animate();
        setTimeout(() => {
            document.getElementById('loader').style.opacity = '0';
            setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
        }, 1000);

    
