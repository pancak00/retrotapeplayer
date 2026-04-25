# pancak

### a premium retro cassette tape music player
pancak is a skeuomorphic web application that brings back the nostalgia of physical media. search for your favorite tracks on youtube, and they appear as physical cassette tapes that you can drag and drop directly into the player to start the music.

![pancak mockup](img/stack-of-pancakes-3d-concept-free-png.webp)

## features
- **drag and drop interface**: interactive search results that behave like physical tapes.
- **3d animations**: realistic eject and insert movements with custom easing.
- **live visualizer**: a frequency-sync equalizer that stretches across the deck.
- **physics-driven ui**: uses matter.js to create a playful, tactile environment.
- **responsive design**: custom css scaling ensures the retro deck looks perfect on desktop, tablet, and mobile.

## tech stack
- **core**: vanilla html5, css3, javascript (es6)
- **physics**: matter.js
- **api**: youtube data api v3 & youtube iframe player api
- **build tool**: vite

## how to run locally
1. **clone the repository**
   ```bash
   git clone https://github.com/pancak00/retrotapeplayer.git
   cd retrotapeplayer
   ```

2. **install dependencies**
   ```bash
   npm install
   ```

3. **start the development server**
   ```bash
   npm run dev
   ```

4. **open in browser**
   navigate to `http://localhost:5173` to start playing.

## deployment
pancak is optimized for web deployment. simply run `npm run build` and host the `dist` folder on vercel, netlify, or github pages.

---
built with ♡ for retro enthusiasts.
