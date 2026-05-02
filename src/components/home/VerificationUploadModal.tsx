import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { uploadVerificationPhoto } from '@/src/lib/verificationRequests';

type Props = {
  visible: boolean;
  requestId: string;
  onUploaded: () => void;
  onDismiss: () => void;
};

type Phase = 'prompt' | 'camera' | 'preview' | 'uploading' | 'done' | 'error';

export default function VerificationUploadModal({
  visible,
  requestId,
  onUploaded,
  onDismiss,
}: Props) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      stopStream();
      setPhase('prompt');
      setCapturedUri(null);
      setCapturedBlob(null);
      setErrorMsg('');
      setUploadError('');
    }
  }, [visible, stopStream]);

  const startWebCamera = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setPhase('camera');
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? '카메라 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.'
          : '카메라를 열 수 없어요.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, []);

  const captureWebPhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUri(canvas.toDataURL('image/jpeg', 0.9));
        stopStream();
        setPhase('preview');
      },
      'image/jpeg',
      0.9,
    );
  }, [stopStream]);

  const startMobileCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('카메라 권한이 필요해요. 기기 설정에서 허용해 주세요.');
      setPhase('error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.9,
      cameraType: ImagePicker.CameraType.back,
    });
    if (result.canceled) {
      setPhase('prompt');
      return;
    }
    const asset = result.assets[0];
    try {
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      setCapturedBlob(blob);
      setCapturedUri(asset.uri);
      setPhase('preview');
    } catch {
      setErrorMsg('사진을 처리하는 중 오류가 발생했어요.');
      setPhase('error');
    }
  }, []);

  const handleStartCamera = useCallback(() => {
    if (Platform.OS === 'web') startWebCamera();
    else startMobileCamera();
  }, [startWebCamera, startMobileCamera]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setCapturedBlob(null);
    setUploadError('');
    if (Platform.OS === 'web') startWebCamera();
    else startMobileCamera();
  }, [startWebCamera, startMobileCamera]);

  const handleSend = useCallback(async () => {
    if (!capturedBlob) return;
    setPhase('uploading');
    setUploadError('');
    try {
      await uploadVerificationPhoto(requestId, capturedBlob);
      setPhase('done');
      onUploaded();
    } catch {
      setUploadError('사진 업로드에 실패했어요. 다시 시도해주세요.');
      setPhase('preview');
    }
  }, [capturedBlob, requestId, onUploaded]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {phase !== 'uploading' && phase !== 'done' && (
            <Pressable style={styles.closeBtn} onPress={onDismiss} accessibilityLabel="닫기">
              <Ionicons name="close" size={22} color="#7b6c62" />
            </Pressable>
          )}

          {phase === 'prompt' && (
            <View style={styles.section}>
              <Ionicons name="eye-outline" size={40} color="#c4a882" />
              <Text style={styles.title}>사진 인증 요청이 도착했어요</Text>
              <Text style={styles.body}>
                {'상대방이 지금 상황 확인을 요청했어요.\n동의하면 사진을 촬영해 전송해주세요.'}
              </Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={handleStartCamera}
                accessibilityLabel="사진 찍기">
                <Text style={styles.primaryBtnText}>사진 찍기</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={onDismiss} accessibilityLabel="나중에">
                <Text style={styles.ghostBtnText}>나중에</Text>
              </Pressable>
            </View>
          )}

          {phase === 'camera' && Platform.OS === 'web' && (
            <View style={styles.section}>
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                style={styles.webVideo as unknown as React.CSSProperties}
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: 'none' }} />
              <Pressable
                style={[styles.primaryBtn, { marginTop: 14 }]}
                onPress={captureWebPhoto}
                accessibilityLabel="사진 찍기">
                <Ionicons name="camera" size={20} color="#5d4e45" />
                <Text style={[styles.primaryBtnText, { marginLeft: 6 }]}>사진 찍기</Text>
              </Pressable>
            </View>
          )}

          {phase === 'preview' && capturedUri && (
            <View style={styles.section}>
              <Text style={styles.title}>사진 미리보기</Text>
              {Platform.OS === 'web' ? (
                <img
                  src={capturedUri}
                  style={styles.previewImg as unknown as React.CSSProperties}
                  alt="촬영된 사진"
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>사진 준비됨</Text>
                </View>
              )}
              {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.halfBtn, styles.ghostBtn]}
                  onPress={handleRetake}
                  accessibilityLabel="다시 찍기">
                  <Text style={styles.ghostBtnText}>다시 찍기</Text>
                </Pressable>
                <Pressable
                  style={[styles.halfBtn, styles.primaryBtn]}
                  onPress={() => void handleSend()}
                  accessibilityLabel="전송하기">
                  <Text style={styles.primaryBtnText}>전송하기</Text>
                </Pressable>
              </View>
            </View>
          )}

          {phase === 'uploading' && (
            <View style={styles.section}>
              <ActivityIndicator size="large" color="#c4a882" />
              <Text style={[styles.body, { marginTop: 16 }]}>전송 중이에요...</Text>
            </View>
          )}

          {phase === 'done' && (
            <View style={styles.section}>
              <Ionicons name="checkmark-circle" size={48} color="#9fc7a0" />
              <Text style={styles.title}>사진을 전송했어요.</Text>
              <Pressable style={styles.primaryBtn} onPress={onDismiss} accessibilityLabel="확인">
                <Text style={styles.primaryBtnText}>확인</Text>
              </Pressable>
            </View>
          )}

          {phase === 'error' && (
            <View style={styles.section}>
              <Ionicons name="alert-circle-outline" size={40} color="#d4927a" />
              <Text style={styles.title}>카메라 오류</Text>
              <Text style={styles.body}>{errorMsg}</Text>
              <Pressable style={styles.primaryBtn} onPress={onDismiss} accessibilityLabel="닫기">
                <Text style={styles.primaryBtnText}>닫기</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(52, 42, 34, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f8f0eb',
    borderRadius: 28,
    padding: 28,
    paddingTop: 36,
  } as const,
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  section: { alignItems: 'center', gap: 12 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5d4e45',
    textAlign: 'center',
    marginTop: 4,
  },
  body: { fontSize: 13, color: '#7b6c62', textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
    paddingHorizontal: 28,
    width: '100%',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#5d4e45' },
  ghostBtn: {
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(189, 159, 145, 0.5)',
    width: '100%',
  },
  ghostBtnText: { fontSize: 13, color: '#9a8a7d' },
  row: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  halfBtn: { flex: 1 },
  webVideo: {
    width: '100%',
    maxWidth: 340,
    height: 240,
    borderRadius: 14,
    backgroundColor: '#2a1f18',
    objectFit: 'cover',
  },
  previewImg: {
    width: '100%',
    maxWidth: 340,
    height: 240,
    borderRadius: 14,
    objectFit: 'cover',
  },
  previewPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#e8d5c8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: { fontSize: 13, color: '#9a8a7d' },
  errorText: { fontSize: 12, color: '#9a6252', textAlign: 'center' },
});
