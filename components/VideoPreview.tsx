import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors } from '@/constants/theme';

interface VideoPreviewProps {
  videoUrl: string;
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = false;
    player.muted = false;
  });

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={false}
      />
      
      {!isPlaying && (
        <Pressable style={styles.playButton} onPress={togglePlayPause}>
          <MaterialIcons name="play-circle-filled" size={64} color={colors.surface} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: colors.text,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    backgroundColor: colors.text + '80',
    borderRadius: 32,
  },
});
