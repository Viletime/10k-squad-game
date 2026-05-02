import * as Tone from 'tone';

let isMuted = false;

// Initialize mute state from localStorage
if (typeof window !== 'undefined') {
  isMuted = localStorage.getItem('soundEnabled') === 'false';
}

export const setMuted = (muted: boolean) => {
  isMuted = muted;
  localStorage.setItem('soundEnabled', (!muted).toString());
};

export const getMuted = () => isMuted;

const playTone = async (freq: string | string[], duration: string | number, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine', volume = -12) => {
  if (isMuted) return;
  
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  
  synth.set({
    oscillator: { type },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
  });
  
  synth.volume.value = volume;
  synth.triggerAttackRelease(freq, duration);
  
  // Cleanup after playing
  setTimeout(() => {
    synth.dispose();
  }, 1000);
};

export const playFlipSound = () => {
  playTone('C4', '0.05', 'triangle', -15);
};

export const playSuccessSound = () => {
  playTone('G4', '0.2', 'sine', -10);
};

export const playErrorSound = () => {
  playTone('C3', '0.15', 'square', -20);
};

export const playVictorySound = () => {
  if (isMuted) return;
  
  const playFanfare = async () => {
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.1 }
    }).toDestination();
    synth.volume.value = -10;

    const now = Tone.now();
    synth.triggerAttackRelease('C5', '0.15', now);
    synth.triggerAttackRelease('E5', '0.15', now + 0.15);
    synth.triggerAttackRelease('G5', '0.3', now + 0.3);
    
    setTimeout(() => synth.dispose(), 2000);
  };
  
  playFanfare();
};
