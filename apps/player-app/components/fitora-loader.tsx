import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

// Brand palette from the Stitch "Refined Splash Screen" loader designs.
const Brand = {
  splashBg: '#1a120e',
  ball: '#f97316',
  ballHighlight: '#ffb347',
  wordmark: '#ffdbca',
  captionDim: '#8c7164',
  ring: 'rgba(224, 192, 177, 0.12)',
  track: 'rgba(249, 115, 22, 0.25)',
} as const;

const MESSAGES = [
  'Preparing your arena...',
  'Syncing performance data...',
  'Calibrating your metrics...',
  'Entering the arena...',
];

function useBounce(duration = 400) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, duration]);
  return bounce;
}

/**
 * Sports-themed bouncing ball loader (Stitch "Sports Loader" shader,
 * recreated with the RN Animated API).
 */
export function FitoraBall({ size = 64 }: { size?: number }) {
  const bounce = useBounce();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const jump = size * 0.55;
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -jump] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shadowScaleX = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const shadowOpacity = bounce.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.12] });

  return (
    <View
      style={{
        width: size * 2,
        height: size * 2.2,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Brand.ball,
          transform: [{ translateY }, { rotate }],
          overflow: 'hidden',
          shadowColor: Brand.ball,
          shadowOpacity: 0.6,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        {/* Highlight + seam to suggest ball texture, like the shader */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.1,
            left: size * 0.14,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: Brand.ballHighlight,
            opacity: 0.7,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -size * 0.25,
            left: size * 0.42,
            width: size * 0.12,
            height: size * 1.5,
            backgroundColor: 'rgba(26, 18, 14, 0.35)',
            borderRadius: size * 0.06,
            transform: [{ rotate: '24deg' }],
          }}
        />
      </Animated.View>
      <Animated.View
        style={{
          marginTop: size * 0.18,
          width: size * 0.9,
          height: size * 0.18,
          borderRadius: size * 0.09,
          backgroundColor: '#000',
          opacity: shadowOpacity,
          transform: [{ scaleX: shadowScaleX }],
        }}
      />
    </View>
  );
}

function ShimmerCaption({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    const rotate = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4000);
    return () => {
      loop.stop();
      clearInterval(rotate);
    };
  }, [opacity]);

  return (
    <Animated.Text style={[styles.caption, { color, opacity }]}>
      {MESSAGES[index].toUpperCase()}
    </Animated.Text>
  );
}

function LoadingBar() {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(slide, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 32] });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackFill, { transform: [{ translateX }] }]} />
    </View>
  );
}

function PulsingRing({ size }: { size: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: Brand.ring,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

interface FitoraLoaderProps {
  /**
   * splash — full-screen dark branded splash (Stitch "Refined Splash Screen").
   * screen — centered loader for in-screen loading states, respects theme bg.
   */
  variant?: 'splash' | 'screen';
  /** Background color for the "screen" variant (defaults to transparent). */
  backgroundColor?: string;
}

export function FitoraLoader({ variant = 'screen', backgroundColor }: FitoraLoaderProps) {
  if (variant === 'splash') {
    return (
      <View style={[styles.splash, { backgroundColor: Brand.splashBg }]}>
        <View style={styles.ringWrap}>
          <PulsingRing size={220} />
          <FitoraBall size={72} />
        </View>
        <Text style={styles.wordmark}>FITORA</Text>
        <ShimmerCaption color={Brand.captionDim} />
        <LoadingBar />
      </View>
    );
  }

  return (
    <View style={[styles.screen, backgroundColor ? { backgroundColor } : null]}>
      <FitoraBall size={44} />
      <LoadingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ringWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  wordmark: {
    color: Brand.wordmark,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
  },
  track: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.track,
    overflow: 'hidden',
  },
  trackFill: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.ball,
  },
});
