import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type EggIconProps = {
  highlight?: boolean;
};

export default function EggIcon({ highlight = false }: EggIconProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlight) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [highlight, pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });

  return (
    <View style={styles.eggWrap}>
      {highlight ? (
        <>
          <Animated.View
            style={[
              styles.warmHalo,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.emphasisArc,
              styles.emphasisLeft,
              {
                opacity: pulseOpacity,
                transform: [{ rotate: '-20deg' }, { scale: pulseScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.emphasisArc,
              styles.emphasisRight,
              {
                opacity: pulseOpacity,
                transform: [{ rotate: '24deg' }, { scale: pulseScale }],
              },
            ]}
          />
        </>
      ) : null}

      <View style={styles.eggShell}>
        <View style={styles.shellHighlight} />
        <View style={[styles.dot, styles.dotLeft]} />
        <View style={[styles.dot, styles.dotRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eggWrap: {
    width: 50,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warmHalo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffe6b8',
  },
  emphasisArc: {
    position: 'absolute',
    width: 12,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#f3cc8b',
  },
  emphasisLeft: {
    left: 3,
    top: 15,
  },
  emphasisRight: {
    right: 4,
    top: 16,
  },
  eggShell: {
    width: 30,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#f8f2e4',
    borderWidth: 1,
    borderColor: 'rgba(116, 93, 76, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellHighlight: {
    position: 'absolute',
    left: 7,
    top: 6,
    width: 9,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dfd2bf',
    opacity: 0.9,
  },
  dotLeft: {
    left: 8,
    top: 11,
  },
  dotRight: {
    right: 8,
    top: 17,
  },
});
