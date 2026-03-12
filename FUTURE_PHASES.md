# ShadowBox - Future Phases & Features

Beyond the core MVP (Phases 1-4), here are the planned enhancements to make ShadowBox a truly immersive training experience.

---

## Phase 5: Avatar System & Voice Coaching

### 1. Avatar/Hologram Mirror 🎭

**Concept**: A 3D avatar that mirrors your movements in real-time, displayed alongside the camera feed.

**Features**:
- **Avatar Selection**: Choose from multiple character skins
  - Boxers (classic, modern, pro)
  - Holographic styles (neon, wireframe, solid)
  - Character types (athletic, heavyweight, speedster)
  - Custom color themes
- **Live Movement Mirroring**: Avatar perfectly mimics user's pose in real-time
- **Side-by-Side Layout**:
  - Left: Camera feed with skeleton overlay
  - Right: 3D avatar mirror
  - Toggle between views on mobile
- **Form Visualization on Avatar**:
  - Color zones on avatar body showing form quality
  - Glow effects on good movements
  - Red highlights on areas needing correction

**Tech Stack**:
- **Three.js** or **Babylon.js** for 3D rendering
- **Skinned mesh animation** driven by MediaPipe landmarks
- **WebGL** for performance
- **glTF models** for avatar assets

**Implementation Notes**:
- Map MediaPipe 33 landmarks to 3D skeleton rig
- Use inverse kinematics (IK) for natural joint movements
- Optimize for 30fps rendering alongside pose detection
- Asset library: 5-10 base avatars to start

---

### 2. Voice Coaching System 🎙️

**Concept**: Real-time audio feedback from an AI coach with selectable voices.

**Features**:
- **Text-to-Speech Integration**:
  - Convert form feedback cues to speech
  - Natural, encouraging coaching tone
  - Context-aware feedback timing (doesn't interrupt flow)
- **Voice Selection**:
  - Male voices (3-4 options: calm, energetic, drill sergeant)
  - Female voices (3-4 options: supportive, technical, motivational)
  - Accent/language options (future: Spanish, etc.)
  - Volume and speed controls
- **Feedback Types**:
  - **Real-time corrections**: "Rotate your hips more", "Keep your guard up"
  - **Encouragement**: "Great jab!", "Nice form on that cross"
  - **Combo prompts**: "Ready? Jab-Cross-Hook"
  - **Session summaries**: "You threw 152 punches with 78% accuracy"
- **Smart Timing**:
  - Queues feedback, doesn't spam
  - Prioritizes critical corrections
  - Celebratory cues after good combos

**Tech Stack**:
- **Web Speech API** (browser native, free)
- OR **ElevenLabs API** (premium voices, more natural)
- OR **Google Cloud Text-to-Speech** (good balance)
- **Audio queue system** to manage overlapping feedback

**Implementation Notes**:
- Feedback priority system (safety > form > encouragement)
- Debounce similar feedback (don't repeat "keep guard up" every second)
- User preference: text-only, voice-only, or both
- Mute/unmute button easily accessible

---

## Phase 6: Advanced Training Features 🏆

(Ideas for after Phase 5)

### Social & Competitive
- **Leaderboards**: Global and friend-based rankings
- **Challenges**: Daily/weekly combo challenges
- **Share Progress**: Post session highlights to social media
- **Virtual Sparring**: Two users train together remotely

### AI Personalization
- **Adaptive Training Plans**: AI generates personalized workout routines
- **Weakness Detection**: Identifies and targets your weak points
- **Progress Predictions**: "Keep this up and you'll master hooks in 2 weeks"
- **Style Analysis**: "Your style is 70% speed-focused, 30% power"

### Content & Drills
- **Guided Workouts**: Pre-programmed training sessions
- **Drill Library**: Footwork, head movement, defensive drills
- **Technique Videos**: Watch pro form, then practice
- **Bag Work Mode**: Track punches on heavy bag (future hardware integration)

### Hardware Integration
- **Smart Glove Support**: Detect punch power and impact
- **VR Mode**: Full immersive training in VR headset
- **Wearable Sensors**: Heart rate, calories, fatigue tracking

---

## Phase 7: Mobile & Offline Support 📱

### Mobile App
- **React Native** or **Progressive Web App (PWA)**
- Optimized UI for phone/tablet
- Portrait and landscape modes
- On-device pose detection (TensorFlow Lite)

### Offline Mode
- Download avatar assets
- Cache voice files
- Local session storage
- Sync when back online

---

## Phase 8: Monetization & Premium Features 💰

### Free Tier
- Basic avatars (2-3 options)
- 1-2 voice options
- Essential combos
- Session tracking

### Premium ($9.99/month or $79.99/year)
- All avatars and skins
- Premium voices (8+ options)
- Advanced combo library (50+ combos)
- Personalized AI training plans
- Progress analytics and insights
- Ad-free experience
- Early access to new features

### One-Time Purchases
- Exclusive avatar packs ($2.99)
- Pro voice packs ($1.99)
- Drill collections ($4.99)

---

## Implementation Priority

**Phase 5A: Voice Coaching** (Easier, high impact)
- Estimated: 15-20 hours
- Use Web Speech API to start (free, simple)
- 2-3 basic voices
- Core feedback cues

**Phase 5B: Avatar System** (Complex, very cool)
- Estimated: 40-50 hours
- Start with simple 3D humanoid model
- 2-3 skin variations
- Basic IK mapping from pose landmarks

**Why Phase 5 is Awesome**:
- Makes training WAY more engaging
- Appeals to gamers and fitness enthusiasts
- Differentiates from other boxing apps
- High viral/shareability potential
- Creates premium feature opportunities

---

## Technical Challenges to Solve

### Avatar System
- **Performance**: Rendering 3D + pose detection at 30fps
- **IK Mapping**: Translating 2D landmarks to 3D skeleton accurately
- **Asset Creation**: Designing or sourcing quality 3D models
- **Mobile Performance**: 3D rendering on lower-end devices

### Voice Coaching
- **Latency**: Feedback must be near-instant
- **Queue Management**: Don't overwhelm with too many audio cues
- **Naturalness**: Text needs to sound human, not robotic
- **Localization**: Supporting multiple languages

---

## User Stories

### Avatar System
> "As a user, I want to see a cool holographic boxer that moves exactly like me, so training feels more immersive and fun."

> "As a user, I want to customize my avatar to match my style, so I feel more connected to the experience."

### Voice Coaching
> "As a user, I want to hear a coach's voice telling me what to improve, so I don't have to keep looking at text on screen while training."

> "As a user, I want to choose a female coach voice that motivates me, so the experience feels personalized."

---

## Next Steps (After Phase 4)

1. **User Research**: Survey beta users on avatar vs. voice priority
2. **Prototype**: Build basic voice coaching with Web Speech API
3. **3D Spike**: Test Three.js skeleton mapping from MediaPipe
4. **Design**: Mock up avatar selection UI
5. **Plan Phase 5**: Break into sub-tasks and estimate effort

---

**These features will make ShadowBox incredibly unique in the fitness/boxing app space. Can't wait to build them!** 🥊✨
