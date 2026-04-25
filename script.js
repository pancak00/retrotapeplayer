// Pancak - Retro Tape Player Logic (Cozy Vintage Edition)

const YT_API_KEY = 'AIzaSyCx7mxXMer1-dY9rih9xbhexA3BSFcLBVQ';

const state = {
    isPlaying: false,
    currentTrack: null,
    player: null,
    isPlayerReady: false,
    timerInterval: null,
    secondsElapsed: 0,
    visualizer: null
};

// --- YouTube IFrame API ---
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    state.player = new YT.Player('player', {
        height: '300', width: '670', videoId: '',
        playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0, 'modestbranding': 1 },
        events: {
            'onReady': () => {
                console.log("Player Ready");
                state.isPlayerReady = true;
            },
            'onStateChange': onPlayerStateChange,
            'onError': (e) => {
                console.error("Player Error", e);
                alert("Sorry, YouTube blocked this specific song from playing outside their website (copyright restriction). Please try searching for a different upload or cover!");
            }
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startPlaybackUI();
    } else {
        stopPlaybackUI();
    }
}

// --- Visualizer: Smooth Frequency Bars (Simulated) ---
class FrequencyVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.bars = 32;
        this.freqData = new Array(this.bars).fill(0);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    update() {
        if (!state.isPlaying) {
            this.freqData = this.freqData.map(v => v * 0.8); // Fade out fast
        } else {
            // Generate smooth simulated frequency data
            for (let i = 0; i < this.bars; i++) {
                const target = Math.random() * 0.8 + (Math.sin(Date.now() * 0.005 + i * 0.2) * 0.2);
                this.freqData[i] += (target - this.freqData[i]) * 0.2;
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const barWidth = (this.canvas.width / this.bars);
        const gutter = 2;

        this.freqData.forEach((val, i) => {
            // Ensure a minimum height of 4px so the visualizer is always visible as a flat line when idle
            const h = Math.max(val * this.canvas.height, 4);
            const x = i * barWidth;
            const y = this.canvas.height - h;

            // Gradient for vintage look
            const grad = this.ctx.createLinearGradient(0, y, 0, this.canvas.height);
            grad.addColorStop(0, '#8fa88f'); // Sage
            grad.addColorStop(1, '#4a5d4a');

            this.ctx.fillStyle = grad;
            this.ctx.fillRect(x + gutter, y, barWidth - gutter * 2, h);
            
            // Add a soft glow top
            this.ctx.fillStyle = 'rgba(143, 168, 143, 0.5)';
            this.ctx.fillRect(x + gutter, y, barWidth - gutter * 2, 2);
        });
    }

    animate() {
        // Only update at 30fps on mobile to save battery/CPU
        const fps = /Android|iPhone|iPad/i.test(navigator.userAgent) ? 30 : 60;
        const interval = 1000 / fps;
        let lastTime = 0;

        const loop = (time) => {
            if (time - lastTime >= interval) {
                this.update();
                this.draw();
                lastTime = time;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// --- YouTube Search ---
async function searchYouTube(query) {
    query = query.trim();
    if (!query) return;
    
    console.log("Searching for:", query);
    
    if (!YT_API_KEY || YT_API_KEY === 'AIzaSyCx7mxXMer1-dY9rih9xbhexA3BSFcLBVQ' === false) {
        // Just a check to ensure key exists
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&videoSyndicated=true&key=${YT_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("YouTube API Error:", data.error);
            alert(`YouTube API Error: ${data.error.message}\nReason: ${data.error.errors[0].reason}`);
            return;
        }

        if (data.items && data.items.length > 0) {
            displayResults(data.items);
        } else {
            const list = document.getElementById('results-list');
            list.innerHTML = '<div style="padding: 20px; text-align: center; font-family: VT323, monospace; color: var(--text-secondary);">NO TAPES FOUND...</div>';
            const panel = document.getElementById('results-panel');
            panel.classList.remove('hidden');
            panel.classList.add('animate-in');
            setTimeout(() => panel.classList.remove('animate-in'), 300);
        }
    } catch (e) { 
        console.error("Fetch Failed:", e); 
        alert("Network Error: Could not connect to YouTube API. Check your connection.");
    }
}

function displayResults(items) {
    const list = document.getElementById('results-list');
    list.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.draggable = true;
        div.innerHTML = `
            <div class="result-thumb" style="background-image: url('${item.snippet.thumbnails.default.url}')"></div>
            <div class="result-info">
                <div class="result-title">${item.snippet.title}</div>
                <div class="result-artist">${item.snippet.channelTitle}</div>
            </div>
        `;
        div.onclick = () => loadTrack(item);
        
        // --- Desktop Drag Support ---
        div.ondragstart = (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify(item));
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => {
                document.getElementById('results-panel').classList.add('hidden');
            }, 10);
        };
        
        // --- Touch Drag Support for Mobile ---
        let touchGhost = null;
        let startX, startY;

        div.ontouchstart = (e) => {
            // Don't prevent default here to allow normal tapping/scrolling if they don't move
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            // Create ghost after a short delay or movement to distinguish from tap/scroll
        };

        div.ontouchmove = (e) => {
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            // If moved enough, start dragging
            if (!touchGhost && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                e.preventDefault();
                touchGhost = div.cloneNode(true);
                touchGhost.style.position = 'fixed';
                // Limit the size of the ghost on mobile so it doesn't "zoom" too much
                const isMobile = window.innerWidth <= 650;
                const ghostWidth = Math.min(div.offsetWidth, isMobile ? 180 : 250);
                const ghostHeight = (ghostWidth / div.offsetWidth) * div.offsetHeight;
                touchGhost.style.width = ghostWidth + 'px';
                touchGhost.style.height = ghostHeight + 'px';
                touchGhost.style.left = '0';
                touchGhost.style.top = '0';
                touchGhost.style.zIndex = '1000';
                touchGhost.style.pointerEvents = 'none';
                touchGhost.style.opacity = '0.9';
                touchGhost.style.willChange = 'transform';
                touchGhost.style.touchAction = 'none';
                // Center the ghost under the finger
                const initialX = touch.clientX - ghostWidth / 2;
                const initialY = touch.clientY - ghostHeight / 2;
                const mobileScale = isMobile ? 1.0 : 0.9; // Scale is relative to ghostWidth now
                touchGhost.style.transform = `translate3d(${initialX}px, ${initialY}px, 0) scale(${mobileScale}) rotate(-5deg)`;
                touchGhost.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)';
                touchGhost.style.transition = 'transform 0.05s linear, opacity 0.2s';
                document.body.appendChild(touchGhost);
                
                document.getElementById('results-panel').classList.add('hidden');
                deck.classList.add('drag-over');
            }

            if (touchGhost) {
                e.preventDefault();
                const ghostWidth = parseFloat(touchGhost.style.width);
                const ghostHeight = parseFloat(touchGhost.style.height);
                const x = touch.clientX - ghostWidth / 2;
                const y = touch.clientY - ghostHeight / 2;
                touchGhost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.05) rotate(-3deg)`;
                
                const deckRect = deck.getBoundingClientRect();
                if (touch.clientX >= deckRect.left && touch.clientX <= deckRect.right &&
                    touch.clientY >= deckRect.top && touch.clientY <= deckRect.bottom) {
                    if (!deck.classList.contains('drag-over')) {
                        deck.classList.add('drag-over');
                        if (window.navigator.vibrate) window.navigator.vibrate(10); // Subtle haptic if supported
                    }
                } else {
                    deck.classList.remove('drag-over');
                }
            }
        };

        div.ontouchend = (e) => {
            if (touchGhost) {
                const touch = e.changedTouches[0];
                const deckRect = deck.getBoundingClientRect();
                
                if (touch.clientX >= deckRect.left && touch.clientX <= deckRect.right &&
                    touch.clientY >= deckRect.top && touch.clientY <= deckRect.bottom) {
                    loadTrack(item);
                } else {
                    document.getElementById('results-panel').classList.remove('hidden');
                }
                
                touchGhost.remove();
                touchGhost = null;
                deck.classList.remove('drag-over');
            }
        };

        list.appendChild(div);
    });
    const panel = document.getElementById('results-panel');
    panel.classList.remove('hidden');
    panel.classList.add('animate-in');
    setTimeout(() => panel.classList.remove('animate-in'), 300);
}

function loadTrack(item) {
    if (!state.isPlayerReady || !state.player) {
        alert("The YouTube player is still initializing. Please wait a moment and try again.");
        return;
    }
    state.currentTrack = item;
    document.getElementById('now-playing-title').textContent = item.snippet.title.toUpperCase();
    document.getElementById('results-panel').classList.add('hidden');
    document.getElementById('cassette').classList.remove('ejected');
    
    // loadVideoById automatically plays the video if the browser allows it.
    state.player.loadVideoById(item.id.videoId);
    state.secondsElapsed = 0;
    updateTimer();
}

// --- Drag and Drop Setup ---
const deck = document.querySelector('.cassette-deck');
deck.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    deck.classList.add('drag-over');
});

deck.addEventListener('dragleave', (e) => {
    deck.classList.remove('drag-over');
});

deck.addEventListener('drop', (e) => {
    e.preventDefault();
    deck.classList.remove('drag-over');
    try {
        const itemData = e.dataTransfer.getData('application/json');
        if (itemData) {
            const item = JSON.parse(itemData);
            loadTrack(item);
            // We rely on loadVideoById to autoplay. If it fails due to browser policy, 
            // the user can simply click the PLAY button.
        }
    } catch (err) {
        console.error("Drop failed:", err);
    }
});

// --- UI Logic ---
function startPlaybackUI() {
    state.isPlaying = true;
    document.getElementById('btn-play').classList.add('active');
    document.getElementById('status-light').classList.add('active');
    document.querySelectorAll('.reel').forEach(r => r.classList.add('spinning'));
    
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.secondsElapsed++;
        updateTimer();
    }, 1000);
}

function stopPlaybackUI() {
    state.isPlaying = false;
    document.getElementById('btn-play').classList.remove('active');
    document.getElementById('status-light').classList.remove('active');
    document.querySelectorAll('.reel').forEach(r => r.classList.remove('spinning'));
    clearInterval(state.timerInterval);
}

function updateTimer() {
    const mins = Math.floor(state.secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (state.secondsElapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${mins}:${secs}`;
}

// --- Physics (Matter.js) ---
function initPhysics() {
    const { Engine, Render, Runner, Bodies, Composite } = Matter;
    const engine = Engine.create();
    const render = Render.create({
        element: document.getElementById('physics-container'),
        engine: engine,
        options: { width: window.innerWidth, height: window.innerHeight, wireframes: false, background: 'transparent' }
    });

    Render.run(render);
    Runner.run(Runner.create(), engine);

    Composite.add(engine.world, [
        Bodies.rectangle(window.innerWidth/2, window.innerHeight+30, window.innerWidth, 60, { isStatic: true }),
        Bodies.rectangle(-30, window.innerHeight/2, 60, window.innerHeight, { isStatic: true }),
        Bodies.rectangle(window.innerWidth+30, window.innerHeight/2, 60, window.innerHeight, { isStatic: true })
    ]);

    function spawnElement() {
        const threshold = /Android|iPhone|iPad/i.test(navigator.userAgent) ? 0.995 : 0.98;
        if (Math.random() > threshold) {
            const x = Math.random() * window.innerWidth;
            const color = Math.random() > 0.5 ? '#8fa88f' : '#d69a9a';
            const shape = Bodies.circle(x, -50, 15, { render: { fillStyle: color, opacity: 0.3 } });
            Composite.add(engine.world, shape);
            setTimeout(() => Composite.remove(engine.world, shape), 8000);
        }
        requestAnimationFrame(spawnElement);
    }
    spawnElement();
}

// --- Listeners ---
function debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const handleLiveSearch = debounce((query) => {
    if (query.trim().length >= 3) {
        searchYouTube(query);
    }
});

document.getElementById('search-input').oninput = (e) => handleLiveSearch(e.target.value);

document.getElementById('search-button').onclick = () => searchYouTube(document.getElementById('search-input').value);
document.getElementById('search-input').onkeypress = (e) => {
    if (e.key === 'Enter') {
        handleLiveSearch.cancel?.(); // Optional: stop debounce if user hits enter
        searchYouTube(e.target.value);
    }
};
document.getElementById('close-results').onclick = () => document.getElementById('results-panel').classList.add('hidden');
document.getElementById('btn-play').onclick = () => state.player?.playVideo();
document.getElementById('btn-stop').onclick = () => state.player?.pauseVideo();
document.getElementById('btn-eject').onclick = () => {
    state.player?.stopVideo();
    state.currentTrack = null;
    document.getElementById('now-playing-title').textContent = "NO TAPE INSERTED";
    document.getElementById('timer').textContent = "00:00";
    document.getElementById('cassette').classList.add('ejected');
    stopPlaybackUI();
};

window.onload = () => {
    state.visualizer = new FrequencyVisualizer('equalizer-canvas');
    state.visualizer.animate();
    initPhysics();
};
