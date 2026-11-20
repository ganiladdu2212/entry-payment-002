import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 1100);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1115' } }} />
      <StatusBar style="light" />
      {showSplash ? (
        <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim, paddingBottom: Math.max(insets.bottom, 28) + 20 }]} pointerEvents="none">
          <View style={styles.splashCenter}>
            <View style={styles.logoRing}>
              <Image
                source={require('../../assets/images/people-fitness-logo.jpg')}
                style={styles.logo}
                accessibilityLabel="Entry Gate logo"
              />
            </View>
            <Text style={styles.appTitle}>Entry Gate</Text>
            <Text style={styles.appSubtitle}>GYM ACCESS &amp; MEMBERSHIP</Text>
          </View>
          <View style={styles.poweredFooter}>
            <Text style={styles.poweredLabel}>POWERED BY</Text>
            <View style={styles.poweredBadge}>
              <View style={styles.poweredDot} />
              <Text style={styles.poweredBrand}>Entry Payment</Text>
            </View>
            <Text style={styles.poweredCopyright}>© {new Date().getFullYear()} entrypayment.com</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F1115',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F1115',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 52,
    zIndex: 999,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 4,
    backgroundColor: 'rgba(255, 200, 58, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 58, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  appTitle: {
    color: '#F3F5F7',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  appSubtitle: {
    color: '#9BA3B0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginTop: 6,
  },
  poweredFooter: {
    alignItems: 'center',
    gap: 8,
  },
  poweredLabel: {
    color: '#6E7785',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  poweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#181C22',
    borderWidth: 1,
    borderColor: '#2A313D',
  },
  poweredDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFC83A',
  },
  poweredBrand: {
    color: '#FFC83A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  poweredCopyright: {
    color: '#6E7785',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
