let scene, camera, renderer, particles;
const count = 20000;
let currentState = 'sphere';
let morphTimeout;
let colorTime = 0;

// Mouse interaction variables
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let isMouseDown = false;

// Camera movement variables
let cameraTargetZ = 25;
let cameraCurrentZ = 25;

// Animation states
let isExploding = false;
let explosionTime = 0;
let isLoading = true;
let explosionParticles = [];
let baseRotationY = 0;

// Store original sphere positions
let originalSpherePositions = null;

// Dynamic theme system
let currentTheme = generateRandomTheme();

// Form submission state
let isFormSubmitted = false;
let formSubmissionInProgress = false;
let thanksAnimationTriggered = false;

function generateRandomTheme() {
    const hueStart = Math.random();
    const hueRange = 0.15 + Math.random() * 0.2;
    const saturation = 0.6 + Math.random() * 0.2;
    const brightnessMin = 0.4 + Math.random() * 0.1;
    const brightnessMax = 0.7 + Math.random() * 0.2;

    return {
        hueRange: [hueStart, (hueStart + hueRange) % 1],
        saturation: saturation,
        brightnessRange: [brightnessMin, brightnessMax],
        name: `Theme ${Math.floor(Math.random() * 1000)}`
    };
}

function hideWebflowSuccessMessage() {
    const style = document.createElement('style');
    style.textContent = `.w-form-done { display: none !important; visibility: hidden !important; opacity: 0 !important; }`;
    document.head.appendChild(style);
}

function resetFormToInitialState() {
    const emailForm = document.getElementById('email-form');
    const submitButton = document.getElementById('typeBtn');
    const emailInput = document.getElementById('morphText');

    if (emailForm && submitButton && emailInput) {
        emailInput.value = '';
        submitButton.setAttribute('disabled', '');
        submitButton.value = "Let's Talk";
        emailInput.blur();
        submitButton.blur();
        emailInput.setCustomValidity('');
        
        emailForm.style.display = '';
        emailForm.style.visibility = '';
        emailForm.style.opacity = '';
        
        const formContainer = emailForm.closest('.w-form');
        if (formContainer) {
            formContainer.style.display = '';
            formContainer.style.visibility = '';
            formContainer.style.opacity = '';
        }
        
        thanksAnimationTriggered = false;
        formSubmissionInProgress = false;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setupEmailValidation() {
    const emailInput = document.getElementById('morphText');
    const submitButton = document.getElementById('typeBtn');
    
    if (!emailInput || !submitButton) return;
    
    function validateAndToggleButton() {
        const email = emailInput.value.trim();
        if (isValidEmail(email)) {
            submitButton.removeAttribute('disabled');
        } else {
            submitButton.setAttribute('disabled', '');
        }
    }
    
    emailInput.addEventListener('keydown', validateAndToggleButton);
    emailInput.addEventListener('keyup', validateAndToggleButton);
    emailInput.addEventListener('input', validateAndToggleButton);
    emailInput.addEventListener('paste', () => {
        setTimeout(validateAndToggleButton, 10);
    });
}

function setupWebflowFormDetection() {
    const emailForm = document.getElementById('email-form');
    const submitButton = document.getElementById('typeBtn');
    const emailInput = document.getElementById('morphText');

    if (!emailForm || !submitButton || !emailInput) {
        return;
    }

    let buttonWasDisabled = submitButton.hasAttribute('disabled');

    const buttonObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                const isNowDisabled = submitButton.hasAttribute('disabled');
                buttonWasDisabled = isNowDisabled;
            }
        });
    });

    buttonObserver.observe(submitButton, {
        attributes: true,
        attributeFilter: ['disabled']
    });

    submitButton.addEventListener('click', (e) => {
        if (!submitButton.hasAttribute('disabled') && !formSubmissionInProgress && !thanksAnimationTriggered) {
            formSubmissionInProgress = true;
            submitButton.value = 'One moment...';
            setTimeout(() => {
                monitorForSuccessMessage();
            }, 200);
        }
    });

    function monitorForSuccessMessage() {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkForSuccess = () => {
            if (thanksAnimationTriggered) {
                return;
            }
            
            const successDiv = document.querySelector('.w-form-done');
            
            if (successDiv) {
                const hasSuccessContent = successDiv.textContent.trim().length > 0;
                const webflowTriedToShow = successDiv.style.display === 'block';
                
                if (hasSuccessContent && webflowTriedToShow) {
                    formSubmissionInProgress = false;
                    handleFormSuccess();
                    return;
                }
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkForSuccess, 100);
            } else {
                formSubmissionInProgress = false;
                handleFormSuccess();
            }
        };
        
        checkForSuccess();
    }

    window.triggerThanks = () => {
        if (!thanksAnimationTriggered) {
            handleFormSuccess();
        }
    };
}

function handleFormSuccess() {
    if (isFormSubmitted || thanksAnimationTriggered) {
        return;
    }

    isFormSubmitted = true;
    thanksAnimationTriggered = true;
    formSubmissionInProgress = false;

    const submitButton = document.getElementById('typeBtn');
    if (submitButton) {
        submitButton.value = "Let's Talk";
    }

    currentTheme = {
        hueRange: [0.3, 0.5],
        saturation: 0.7,
        brightnessRange: [0.5, 0.8]
    };

    morphToText("Thanks");

    setTimeout(() => {
        isFormSubmitted = false;
        morphToCircle();
        
        setTimeout(() => {
            resetFormToInitialState();
        }, 500);
    }, 5000);
}

function init() {
    if (window.Webflow && window.Webflow.env && window.Webflow.env() === 'editor') {
        return;
    }

    hideWebflowSuccessMessage();

    scene = new THREE.Scene();

    const parentElement = document.getElementById('sphere');
    if (!parentElement) {
        return;
    }

    const parentWidth = parentElement.clientWidth;
    const parentHeight = parentElement.clientHeight || parentWidth;

    camera = new THREE.PerspectiveCamera(75, parentWidth / parentHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });

    renderer.setSize(parentWidth, parentHeight);
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    parentElement.appendChild(renderer.domElement);

    camera.position.z = 100;
    cameraCurrentZ = 100;
    cameraTargetZ = 25;

    createParticles();
    setupEventListeners();
    setupMouseControls();
    createActionButtons();

    setTimeout(() => {
        setupWebflowFormDetection();
        setupEmailValidation();
    }, 1000);

    setTimeout(() => {
        elegantEntrance();
    }, 500);

    animate();
}

function elegantEntrance() {
    isLoading = false;

    gsap.to(camera.position, {
        z: 25,
        duration: 3,
        ease: "power2.out"
    });

    const positions = particles.geometry.attributes.position.array;
    const originalPositions = [...positions];

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (Math.random() - 0.5) * 50;
        positions[i + 1] = (Math.random() - 0.5) * 50;
        positions[i + 2] = (Math.random() - 0.5) * 50;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    gsap.to(positions, {
        duration: 2.5,
        ease: "power2.out",
        onUpdate: () => {
            for (let i = 0; i < positions.length; i += 3) {
                const progress = gsap.getProperty(positions, 'progress') || 0;
                positions[i] = positions[i] + (originalPositions[i] - positions[i]) * progress;
                positions[i + 1] = positions[i + 1] + (originalPositions[i + 1] - positions[i + 1]) * progress;
                positions[i + 2] = positions[i + 2] + (originalPositions[i + 2] - positions[i + 2]) * progress;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        }
    });

    gsap.fromTo(particles.material, {
        opacity: 0
    }, {
        opacity: 0.9,
        duration: 2,
        ease: "power2.out"
    });
}

function createActionButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 1000;`;

    const colorButton = document.createElement('button');
    colorButton.innerHTML = '🎨 Colour Me!';
    colorButton.style.cssText = `
        padding: 12px 20px;
        border: 2px solid rgba(255,255,255,0.3);
        background: rgba(0,0,0,0.5);
        color: white;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;

    colorButton.addEventListener('click', () => {
        generateNewColors();
        gsap.to(colorButton, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    });

    colorButton.addEventListener('mouseenter', () => {
        colorButton.style.background = 'rgba(255,255,255,0.1)';
        colorButton.style.borderColor = 'rgba(255,255,255,0.6)';
        colorButton.style.transform = 'translateY(-2px)';
        colorButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });

    colorButton.addEventListener('mouseleave', () => {
        colorButton.style.background = 'rgba(0,0,0,0.5)';
        colorButton.style.borderColor = 'rgba(255,255,255,0.3)';
        colorButton.style.transform = 'translateY(0px)';
        colorButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });

    const fireworksButton = document.createElement('button');
    fireworksButton.innerHTML = '🎆 Fireworks!';
    fireworksButton.style.cssText = colorButton.style.cssText;

    fireworksButton.addEventListener('click', () => {
        triggerFireworks();
        gsap.to(fireworksButton, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });
    });

    fireworksButton.addEventListener('mouseenter', () => {
        fireworksButton.style.background = 'rgba(255,100,100,0.2)';
        fireworksButton.style.borderColor = 'rgba(255,100,100,0.6)';
        fireworksButton.style.transform = 'translateY(-2px)';
        fireworksButton.style.boxShadow = '0 6px 20px rgba(255,100,100,0.3)';
    });

    fireworksButton.addEventListener('mouseleave', () => {
        fireworksButton.style.background = 'rgba(0,0,0,0.5)';
        fireworksButton.style.borderColor = 'rgba(255,255,255,0.3)';
        fireworksButton.style.transform = 'translateY(0px)';
        fireworksButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });

    buttonContainer.appendChild(colorButton);
    buttonContainer.appendChild(fireworksButton);
    document.body.appendChild(buttonContainer);
}

function generateNewColors() {
    currentTheme = generateRandomTheme();

    gsap.to(particles.material, {
        opacity: 0.5,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
            particles.material.opacity = 0.9;
        }
    });
}

function triggerFireworks() {
    if (isExploding) return;

    isExploding = true;
    currentState = 'fireworks';

    const positions = particles.geometry.attributes.position.array;

    gsap.to(particles.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: 1.5,
        ease: "power2.inOut"
    });

    gsap.to(particles.rotation, {
        x: Math.PI * 4,
        y: Math.PI * 4,
        z: Math.PI * 2,
        duration: 1.5,
        ease: "power2.inOut"
    });

    currentTheme = {
        hueRange: [0.0, 0.1],
        saturation: 1.0,
        brightnessRange: [0.8, 1.0]
    };

    gsap.to(camera.position, {
        z: 15,
        duration: 1.5,
        ease: "power2.inOut"
    });

    setTimeout(() => {
        explodeParticles();
    }, 1500);
}

function explodeParticles() {
    const positions = particles.geometry.attributes.position.array;

    particles.scale.set(1, 1, 1);
    particles.rotation.set(0, 0, 0);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;
        
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const speed = 20 + Math.random() * 30;
        
        const velocity = {
            x: Math.sin(angle2) * Math.cos(angle1) * speed,
            y: Math.sin(angle2) * Math.sin(angle1) * speed,
            z: Math.cos(angle2) * speed
        };
        
        explosionParticles[i] = {
            velocity: velocity,
            life: 1.0,
            decay: 0.004 + Math.random() * 0.002
        };
    }

    particles.geometry.attributes.position.needsUpdate = true;

    const originalZ = camera.position.z;
    gsap.to(camera.position, {
        z: originalZ - 5,
        duration: 0.2,
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut"
    });

    animateExplosion();

    setTimeout(() => {
        completeRestart();
    }, 4000);
}

function animateExplosion() {
    const positions = particles.geometry.attributes.position.array;

    const explode = () => {
        let anyAlive = false;
        
        for (let i = 0; i < count; i++) {
            const explosion = explosionParticles[i];
            if (!explosion || explosion.life <= 0) continue;
            
            anyAlive = true;
            const i3 = i * 3;
            
            explosion.velocity.y -= 0.3;
            explosion.velocity.x *= 0.98;
            explosion.velocity.y *= 0.98;
            explosion.velocity.z *= 0.98;
            
            positions[i3] += explosion.velocity.x;
            positions[i3 + 1] += explosion.velocity.y;
            positions[i3 + 2] += explosion.velocity.z;
            
            explosion.life -= explosion.decay;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        if (anyAlive && isExploding) {
            requestAnimationFrame(explode);
        }
    };

    explode();
}

function completeRestart() {
    isExploding = false;
    explosionParticles = [];
    currentState = 'sphere';
    isLoading = true;

    currentTheme = generateRandomTheme();

    camera.position.z = 100;
    cameraCurrentZ = 100;
    cameraTargetZ = 25;

    baseRotationY = 0;

    particles.scale.set(1, 1, 1);
    particles.rotation.set(0, 0, 0);

    scene.remove(particles);
    createParticles();

    setTimeout(() => {
        elegantEntrance();
    }, 500);
}

function setupMouseControls() {
    const canvas = renderer.domElement;

    canvas.addEventListener('mousemove', (event) => {
        if (currentState === 'sphere' && !isExploding) {
            const rect = canvas.getBoundingClientRect();
            mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            targetRotationY = mouseX * 0.5;
            targetRotationX = mouseY * 0.3;
        }
    });

    canvas.addEventListener('wheel', (event) => {
        if (!isExploding) {
            event.preventDefault();
            cameraTargetZ += event.deltaY * 0.01;
            cameraTargetZ = Math.max(15, Math.min(40, cameraTargetZ));
        }
    });

    canvas.addEventListener('mousedown', () => {
        isMouseDown = true;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
        canvas.style.cursor = 'default';
        targetRotationX *= 0.95;
        targetRotationY *= 0.95;
    });

    canvas.style.cursor = 'grab';
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    function sphericalDistribution(i) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        return {
            x: 8 * Math.cos(theta) * Math.sin(phi),
            y: 8 * Math.sin(theta) * Math.sin(phi),
            z: 8 * Math.cos(phi)
        };
    }

    for (let i = 0; i < count; i++) {
        const point = sphericalDistribution(i);
        
        positions[i * 3] = point.x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5;

        const color = getParticleColor(point, i);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    originalSpherePositions = new Float32Array(positions);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.13,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0,
        sizeAttenuation: true
    });

    particles = new THREE.Points(geometry, material);
    particles.rotation.x = 0;
    particles.rotation.y = 0;
    particles.rotation.z = 0;
    scene.add(particles);
}

function getParticleColor(point, index) {
    const color = new THREE.Color();
    const depth = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) / 8;

    const angle = Math.atan2(point.y, point.x);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);

    const timeOffset = colorTime * 0.1;

    const depthInfluence = depth * 0.3;
    const angleInfluence = normalizedAngle * 0.2;
    const timeInfluence = (Math.sin(timeOffset + index * 0.001) + 1) * 0.05;

    const gradientMix = Math.max(0, Math.min(1, 
        0.5 + depthInfluence + angleInfluence + timeInfluence
    ));

    let hue;
    const hueRange = currentTheme.hueRange[1] - currentTheme.hueRange[0];

    if (isExploding && explosionParticles[index]) {
        const life = explosionParticles[index].life || 1;
        hue = currentTheme.hueRange[0] + Math.random() * hueRange;
        const brightness = Math.min(1.0, 0.4 + life * 0.6);
        color.setHSL(hue, currentTheme.saturation, brightness);
    } else {
        hue = currentTheme.hueRange[0] + gradientMix * hueRange;
        
        const brightnessVariation = (Math.sin(timeOffset * 0.5 + depth * 2) + 1) * 0.03;
        const brightness = currentTheme.brightnessRange[0] + 
                          gradientMix * (currentTheme.brightnessRange[1] - currentTheme.brightnessRange[0]) +
                          brightnessVariation;
        
        const saturationVariation = (Math.sin(timeOffset * 0.3 + normalizedAngle * Math.PI) + 1) * 0.02;
        const saturation = Math.min(1.0, Math.max(0.3, currentTheme.saturation + saturationVariation));
        
        color.setHSL(hue, saturation, Math.max(0.2, Math.min(0.9, brightness)));
    }

    return color;
}

function setupEventListeners() {
}

function createTextPoints(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const baseFontSize = 120;
    const maxTextWidth = 14;

    let fontSize = baseFontSize;
    ctx.font = `bold ${fontSize}px Arial`;
    let textMetrics = ctx.measureText(text);

    const baseScale = 8;
    let projected3DWidth = textMetrics.width / baseScale;

    if (projected3DWidth > maxTextWidth) {
        const scaleFactor = maxTextWidth / projected3DWidth;
        fontSize = fontSize * scaleFactor;
    }

    if (text.length > 10) {
        const lengthPenalty = Math.max(0.6, 1 - (text.length - 10) * 0.03);
        fontSize *= lengthPenalty;
    }

    fontSize = Math.max(35, fontSize);

    const padding = 20;

    ctx.font = `bold ${fontSize}px Arial`;
    textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const points = [];
    const threshold = 128;

    const scale3D = baseScale;
    const samplingRate = Math.max(0.5, Math.min(0.7, 0.6 * (fontSize / baseFontSize) + 0.3));

    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > threshold) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            if (Math.random() < samplingRate) {
                points.push({
                    x: (x - canvas.width / 2) / scale3D,
                    y: -(y - canvas.height / 2) / scale3D
                });
            }
        }
    }

    return points;
}

function morphToText(text) {
    if (isExploding) return;

    currentState = 'text';
    const textPoints = createTextPoints(text);
    const positions = particles.geometry.attributes.position.array;
    const targetPositions = new Float32Array(count * 3);

    cameraTargetZ = 20;

    gsap.to(particles.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: "power2.inOut"
    });

    for (let i = 0; i < count; i++) {
        if (i < textPoints.length) {
            targetPositions[i * 3] = textPoints[i].x;
            targetPositions[i * 3 + 1] = textPoints[i].y;
            targetPositions[i * 3 + 2] = 0;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 20 + 10;
            targetPositions[i * 3] = Math.cos(angle) * radius;
            targetPositions[i * 3 + 1] = Math.sin(angle) * radius;
            targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
    }

    for (let i = 0; i < positions.length; i += 3) {
        gsap.to(particles.geometry.attributes.position.array, {
            [i]: targetPositions[i],
            [i + 1]: targetPositions[i + 1],
            [i + 2]: targetPositions[i + 2],
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                particles.geometry.attributes.position.needsUpdate = true;
            }
        });
    }
}

function morphToCircle() {
    currentState = 'sphere';
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;

    cameraTargetZ = 25;

    for (let i = 0; i < positions.length; i += 3) {
        gsap.to(particles.geometry.attributes.position.array, {
            [i]: originalSpherePositions[i],
            [i + 1]: originalSpherePositions[i + 1],
            [i + 2]: originalSpherePositions[i + 2],
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                particles.geometry.attributes.position.needsUpdate = true;
            }
        });
    }

    for (let i = 0; i < count; i++) {
        const point = {
            x: originalSpherePositions[i * 3],
            y: originalSpherePositions[i * 3 + 1],
            z: originalSpherePositions[i * 3 + 2]
        };
        
        const color = getParticleColor(point, i);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    for (let i = 0; i < colors.length; i += 3) {
        gsap.to(particles.geometry.attributes.color.array, {
            [i]: colors[i],
            [i + 1]: colors[i + 1],
            [i + 2]: colors[i + 2],
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                particles.geometry.attributes.color.needsUpdate = true;
            }
        });
    }
}

function animate() {
    requestAnimationFrame(animate);

    colorTime += 0.016;
    baseRotationY += 0.001;

    cameraCurrentZ += (cameraTargetZ - cameraCurrentZ) * 0.05;
    camera.position.z = cameraCurrentZ;

    if (currentState === 'sphere' && !isExploding) {
        const mouseInfluenceY = (targetRotationY - particles.rotation.y) * 0.05;
        const mouseInfluenceX = (targetRotationX - particles.rotation.x) * 0.05;
        
        particles.rotation.y = baseRotationY + targetRotationY;
        particles.rotation.x += mouseInfluenceX;
    } else if (currentState === 'text') {
        particles.rotation.y = 0;
        particles.rotation.x = 0;
    }

    const colors = particles.geometry.attributes.color.array;
    const positions = particles.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
        const point = {
            x: positions[i * 3],
            y: positions[i * 3 + 1],
            z: positions[i * 3 + 2]
        };
        
        const color = getParticleColor(point, i);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particles.geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const parentElement = document.getElementById('sphere');
    if (!parentElement) return;

    const parentWidth = parentElement.clientWidth;
    const parentHeight = parentElement.clientHeight || parentWidth;

    camera.aspect = parentWidth / parentHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(parentWidth, parentHeight);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Disable email input initially
        const emailInput = document.getElementById('morphText');
        if (emailInput) {
            emailInput.setAttribute('disabled', '');
        }
        setTimeout(init, 500);
    });
} else {
    // Disable email input initially
    const emailInput = document.getElementById('morphText');
    if (emailInput) {
        emailInput.setAttribute('disabled', '');
    }
    setTimeout(init, 500);
}

function interceptFormSubmission() {
    const emailForm = document.getElementById('email-form');

    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(emailForm);
            
            try {
                const response = await fetch(emailForm.action, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    handleFormSuccess();
                } else {
                    alert(result.message || 'Something went wrong. Please try again.');
                }
            } catch (error) {
                alert('Network error. Please try again.');
            }
        });
    }
}

setTimeout(() => {
    interceptFormSubmission();
}, 1000);