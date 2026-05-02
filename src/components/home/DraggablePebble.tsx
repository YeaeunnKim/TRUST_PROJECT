import React, { useRef } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';

const MIN_THROW_DISTANCE = 25;

type Props = {
  onThrow?: () => void;
};

export default function DraggablePebble({ onThrow }: Props) {
  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const isThrowingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isThrowingRef.current,
      onMoveShouldSetPanResponder: () => !isThrowingRef.current,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        position.stopAnimation();
        Animated.spring(scale, {
          toValue: 1.18,
          useNativeDriver: true,
          speed: 24,
          bounciness: 0,
        }).start();
      },

      onPanResponderMove: (_e, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },

      onPanResponderRelease: (_e, gesture) => {
        const dx = gesture.dx;
        const dy = gesture.dy;
        const distance = Math.hypot(dx, dy);

        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 24,
          bounciness: 0,
        }).start();

        if (distance < MIN_THROW_DISTANCE) {
          // Too short — snap back
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            bounciness: 10,
            speed: 14,
          }).start();
          return;
        }

        // Throw
        isThrowingRef.current = true;
        const ndx = dx / distance;
        const ndy = dy / distance;
        const power = Math.min(Math.max(distance * 8, 600), 1400);

        onThrow?.();
        rotate.setValue(0);

        Animated.parallel([
          Animated.timing(position, {
            toValue: { x: ndx * power, y: ndy * power },
            duration: 620,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 1,
            duration: 620,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Reset to origin after fly-out
          position.setValue({ x: 0, y: 0 });
          rotate.setValue(0);
          isThrowingRef.current = false;
        });
      },
    })
  ).current;

  const rotateDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '540deg'],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityLabel="돌맹이 던지기"
      accessibilityRole="button"
      style={[
        styles.pebble,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotateDeg },
            { scale },
          ],
        },
      ]}>
      {/* highlight */}
      <View style={styles.highlight} />
      {/* shadow grain */}
      <View style={styles.shadowSpot} />
      {/* surface texture */}
      <View style={styles.texture} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pebble: {
    position: 'absolute',
    right: 28,
    bottom: 42,
    width: 42,
    height: 34,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 21,
    backgroundColor: '#b89b7e',
    zIndex: 30,
    elevation: 7,
    shadowColor: '#5d4e45',
    shadowOpacity: 0.38,
    shadowOffset: { width: 2, height: 4 },
    shadowRadius: 5,
  },
  highlight: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 13,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  shadowSpot: {
    position: 'absolute',
    bottom: 5,
    right: 7,
    width: 16,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(80, 58, 38, 0.22)',
  },
  texture: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(140, 100, 68, 0.2)',
  },
});
