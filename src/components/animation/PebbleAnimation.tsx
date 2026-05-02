import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
  isAnimating: boolean;
  onAnimationEnd: () => void;
};

export default function PebbleAnimation({ isAnimating, onAnimationEnd }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAnimating) return;

    translateY.setValue(0);
    translateX.setValue(0);
    opacity.setValue(1);
    scale.setValue(0.7);
    rotate.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -260,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 18,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -8,
          duration: 330,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.2,
          duration: 350,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 650,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onAnimationEnd();
    });
  }, [isAnimating, translateY, translateX, opacity, scale, rotate, onAnimationEnd]);

  if (!isAnimating) return null;

  const rotateDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.pebble,
          {
            transform: [{ translateX }, { translateY }, { scale }, { rotate: rotateDeg }],
            opacity,
          },
        ]}
      >
        <View style={styles.pebbleHighlight} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: 'none',
  } as const,
  pebble: {
    width: 20,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#c4a882',
    shadowColor: '#5d4e45',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  pebbleHighlight: {
    width: 7,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
