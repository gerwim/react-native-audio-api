import React, { useCallback, useEffect, useRef, useState, FC } from 'react';
import { Container, Button, Spacer } from '../../components';
import { Asset } from 'expo-asset';

import {
  AudioBuffer,
  AudioContext,
  AudioBufferSourceNode,
} from 'react-native-audio-api';
import { ActivityIndicator } from 'react-native';

type SoundTracks = Record<
  string,
  {
    audioBuffer?: AudioBuffer;
    audioBufferNode?: AudioBufferSourceNode;
    gainNode: GainNode;
    volume: number;
  }
>;

const SyncedAudioPlayer: FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [startTime, setStartTime] = useState(0);
  const [offset, setOffset] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const soundTracks = useRef<SoundTracks>({});

  const loadAudioFiles = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      for (const file of (
        await Asset.loadAsync([
          require('./bongo.wav'),
          require('./drums.wav'),
          require('./electricbass.wav'),
          require('./guitar.wav'),
        ])
      ).map((x) => x.localUri)) {
        const buffer =
          await audioContextRef.current!.decodeAudioDataSource(file);
        const gainNode = audioContextRef.current!.createGain();
        gainNode.connect(audioContextRef.current!.destination);

        soundTracks.current = {
          ...soundTracks.current,
          [file]: { audioBuffer: buffer, gainNode, volume: 1 },
        };
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const stop = (stopTime = undefined) => {
    Object.values(soundTracks.current).map((track) =>
      track.audioBufferNode?.stop(stopTime)
    );
  };

  const play = (startTime: number, offset: number) => {
    Object.keys(soundTracks.current).forEach((sound) => {
      if (!audioContextRef.current) return;
      const audioNodes = soundTracks.current[sound];
      if (!audioNodes.audioBuffer) return;

      const bufferNode = audioContextRef.current.createBufferSource();
      bufferNode.connect(audioNodes.gainNode);

      bufferNode.buffer = soundTracks.current[sound].audioBuffer!;
      bufferNode.loop = true;
      bufferNode.start(startTime, offset);

      soundTracks.current = {
        ...soundTracks.current,
        [sound]: {
          ...soundTracks.current[sound],
          audioBufferNode: bufferNode,
        },
      };
    });
  };

  const handlePress = () => {
    if (!audioContextRef.current) {
      return;
    }

    if (isPlaying) {
      const stopTime = audioContextRef.current.currentTime;
      stop(stopTime);
      setOffset((prev) => prev + stopTime - startTime);
    } else {
      setStartTime(audioContextRef.current.currentTime);
      play(startTime, offset);
    }

    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    loadAudioFiles();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <Container centered>
      {isLoading && <ActivityIndicator color="#FFFFFF" />}
      <Spacer.Vertical size={20} />
      <Button
        title={isPlaying ? 'Stop' : 'Play'}
        onPress={handlePress}
        disabled={isLoading}
      />
    </Container>
  );
};

export default SyncedAudioPlayer;
