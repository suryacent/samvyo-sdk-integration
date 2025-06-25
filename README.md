# Samvyo Video Calling SDK - React Integration

A production-ready video calling application built with React and the Samvyo JavaScript SDK. This demo showcases how to integrate real-time video calling capabilities into your web applications.

## 🚀 Features

- **Real-time Video Calling**: High-quality video and audio streaming
- **Screen Sharing**: Share your screen with participants
- **Device Management**: Switch between audio/video devices
- **Moderator Controls**: Room management and participant authentication
- **Recording**: Start/stop meeting recordings
- **Professional UI**: Modern dark theme with responsive design
- **Participant Management**: Real-time participant tracking and status
- **Error Handling**: Comprehensive error management and user feedback

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Modern web browser with WebRTC support
- Samvyo SDK credentials and backend API

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd samvyo-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Samvyo SDK**
   ```bash
   npm install samvyo-js-sdk
   ```

4. **Install additional dependencies**
   ```bash
   npm install lucide-react
   ```

## 🔧 SDK Integration Guide

### 1. Core SDK Initialization

The Samvyo SDK requires a two-step initialization process:

#### Step 1: Fetch Session Token
```javascript
const fetchSessionToken = async (roomId) => {
  try {
    const response = await fetch('http://localhost:3000/api/create-session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.sessionToken || data.token;
  } catch (err) {
    throw new Error(`Failed to fetch session token: ${err.message}`);
  }
};
```

#### Step 2: Initialize SDK
```javascript
import samvyo from 'samvyo-js-sdk';

const initializeSDK = async (roomId, peerName) => {
  try {
    // Fetch session token from your backend
    const token = await fetchSessionToken(roomId);

    // Initialize Samvyo SDK
    const client = await samvyo.JsSdk.init({
      sessionToken: token,
      roomId: roomId,
      peerName: peerName || 'Anonymous'
    });

    // Set up event listeners
    setupEventListeners(client);

    return client;
  } catch (err) {
    throw new Error(`Initialization failed: ${err.message}`);
  }
};
```

### 2. Join Room Function

After initialization, join the room with media configuration:

```javascript
const joinRoom = async (client, peerName, deviceIds) => {
  try {
    const params = {
      peerName: peerName || 'Anonymous',
      produce: true,           // Enable media production
      consume: true,           // Enable media consumption
      audioDeviceId: deviceIds.audioDeviceId,
      videoDeviceId: deviceIds.videoDeviceId,
      // Additional configuration options
      videoResolution: "hd",
      produceAudio: true,
      produceVideo: true,
      forcePCMU: false,
      forceH264: false,
      h264Profile: "high",
      forceFPS: 30,
      enableWebcamLayers: true,
      numSimulcastStreams: 3,
      videoBitRates: [500, 250, 100],
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44000,
      channelCount: 1,
      msRegion: "us",
      authenticationRequired: false,
      peerType: "moderator",   // or "participant"
      password: ""
    };

    await client.joinRoom(params);
    console.log('Successfully joined room');
  } catch (err) {
    throw new Error(`Failed to join room: ${err.message}`);
  }
};
```

### 3. Event Listeners Setup

Set up comprehensive event listeners for real-time communication:

```javascript
const setupEventListeners = (client) => {
  // Core events
  client.on('initSuccess', () => {
    console.log('SDK initialized successfully');
  });

  client.on('joinSuccess', () => {
    console.log('Successfully joined room');
  });

  client.on('joinError', (error) => {
    console.error('Error joining room:', error);
  });

  // Peer events
  client.on('newPeer', ({ peerId, peerName, type }) => {
    console.log(`New peer joined: ${peerName} (ID: ${peerId})`);
    // Handle new peer joining
  });

  client.on('peerLeft', ({ peerId }) => {
    console.log(`Peer left: ${peerId}`);
    // Handle peer leaving
  });

  // Media events
  client.on('videoStart', ({ peerId, videoTrack, type }) => {
    console.log(`Video started for peer: ${peerId}`);
    // Attach video track to video element
    attachVideoTrack(peerId, videoTrack);
  });

  client.on('micStart', ({ peerId, audioTrack, type }) => {
    console.log(`Mic started for peer: ${peerId}`);
    // Attach audio track to audio element
    attachAudioTrack(peerId, audioTrack);
  });

  // Screen sharing events
  client.on('ssVideoStart', ({ peerId, videoTrack, type }) => {
    console.log('Screen share video started');
    // Handle screen sharing
  });

  // Error handling
  client.on('error', ({ code, text }) => {
    console.error('Error code:', code, 'Error text:', text);
  });

  client.on('roomClosed', ({ roomId }) => {
    console.log('Room closed by moderator');
    // Handle room closure
  });
};
```

### 4. Media Stream Management

Handle video and audio streams properly:

```javascript
const attachVideoTrack = (peerId, videoTrack) => {
  const videoElement = document.getElementById(`video-${peerId}`);
  if (videoElement && videoTrack) {
    const videoStream = new MediaStream();
    videoStream.addTrack(videoTrack);
    videoElement.srcObject = videoStream;
    videoElement.play().catch(error => {
      console.warn(`Error playing video for peer ${peerId}:`, error);
    });
  }
};

const attachAudioTrack = (peerId, audioTrack) => {
  const audioElement = document.getElementById(`audio-${peerId}`);
  if (audioElement && audioTrack) {
    const audioStream = new MediaStream();
    audioStream.addTrack(audioTrack);
    audioElement.srcObject = audioStream;
    audioElement.play().catch(error => {
      console.warn(`Error playing audio for peer ${peerId}:`, error);
    });
  }
};
```

### 5. Media Controls

Implement media control functions:

```javascript
// Toggle microphone
const toggleMic = async (client) => {
  try {
    if (isMuted) {
      await client.unmuteMic();
      console.log('Microphone unmuted');
    } else {
      await client.muteMic();
      console.log('Microphone muted');
    }
  } catch (err) {
    console.error('Failed to toggle microphone:', err);
  }
};

// Toggle camera
const toggleCamera = async (client, deviceId) => {
  try {
    if (isCameraOn) {
      await client.disableCam();
      console.log('Camera turned off');
    } else {
      await client.enableCam({ deviceId });
      console.log('Camera turned on');
    }
  } catch (err) {
    console.error('Failed to toggle camera:', err);
  }
};

// Screen sharing
const toggleScreenShare = async (client) => {
  try {
    if (isScreenSharing) {
      await client.disableShare();
      console.log('Screen share stopped');
    } else {
      await client.enableShare();
      console.log('Screen share started');
    }
  } catch (err) {
    console.error('Failed to toggle screen share:', err);
  }
};
```

### 6. Device Management

Handle audio and video device selection:

```javascript
const getAllDevices = async () => {
  try {
    const client = await samvyo.JsSdk;
    const availableDevices = await client.listDevices();
    
    if (availableDevices.success) {
      const audioDevices = availableDevices.deviceList.audioDevices || [];
      const videoDevices = availableDevices.deviceList.videoDevices || [];
      
      return { audioDevices, videoDevices };
    }
  } catch (err) {
    console.error('Failed to get devices:', err);
  }
};

const changeAudioInput = async (client, deviceId) => {
  try {
    await client.changeAudioInput({ deviceId });
    console.log('Audio input changed');
  } catch (err) {
    console.error('Failed to change audio input:', err);
  }
};

const changeVideoInput = async (client, deviceId) => {
  try {
    await client.changeVideoInput({ deviceId });
    console.log('Video input changed');
  } catch (err) {
    console.error('Failed to change video input:', err);
  }
};
```

## 🎯 Usage Example

Here's a complete example of how to use the SDK:

```javascript
import React, { useState, useEffect } from 'react';
import samvyo from 'samvyo-js-sdk';

function VideoCall() {
  const [client, setClient] = useState(null);
  const [isJoined, setIsJoined] = useState(false);

  const startCall = async () => {
    try {
      // 1. Initialize SDK
      const vidScaleClient = await initializeSDK('room-123', 'John Doe');
      setClient(vidScaleClient);

      // 2. Join room
      await joinRoom(vidScaleClient, 'John Doe', {
        audioDeviceId: 'default-audio-device',
        videoDeviceId: 'default-video-device'
      });

      setIsJoined(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const leaveCall = async () => {
    if (client) {
      try {
        await client.leaveRoom();
        setIsJoined(false);
        setClient(null);
      } catch (error) {
        console.error('Failed to leave call:', error);
      }
    }
  };

  return (
    <div>
      {!isJoined ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <button onClick={leaveCall}>Leave Call</button>
      )}
    </div>
  );
}
```

## 🔧 Configuration Options

### SDK Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `videoResolution` | string | "hd" | Video resolution quality |
| `produce` | boolean | true | Enable media production |
| `consume` | boolean | true | Enable media consumption |
| `produceAudio` | boolean | true | Enable audio production |
| `produceVideo` | boolean | true | Enable video production |
| `forcePCMU` | boolean | false | Force PCMU codec |
| `forceH264` | boolean | false | Force H264 codec |
| `h264Profile` | string | "high" | H264 profile (low/high) |
| `forceFPS` | number | 30 | Force specific FPS |
| `numSimulcastStreams` | number | 3 | Number of simulcast streams |
| `videoBitRates` | array | [500, 250, 100] | Video bitrates for different qualities |
| `autoGainControl` | boolean | true | Enable auto gain control |
| `echoCancellation` | boolean | true | Enable echo cancellation |
| `noiseSuppression` | boolean | true | Enable noise suppression |
| `sampleRate` | number | 44000 | Audio sample rate |
| `channelCount` | number | 1 | Audio channel count |
| `msRegion` | string | "us" | Media server region |
| `peerType` | string | "participant" | Peer type (moderator/participant) |

## 🚀 Running the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to `http://localhost:5173`

3. **Test the application**
   - Enter a room ID
   - Enter your name
   - Click "Initialize SDK" then "Join Room"
   - Test video/audio functionality

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔒 Security Considerations

- Always fetch session tokens from your secure backend
- Implement proper authentication and authorization
- Use HTTPS in production
- Validate all user inputs
- Handle sensitive data securely

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch session token"**
   - Ensure your backend API is running
   - Check API endpoint URL
   - Verify CORS configuration

2. **"No video/audio devices found"**
   - Check browser permissions
   - Ensure devices are connected
   - Try refreshing the page

3. **"Failed to join room"**
   - Verify room ID format
   - Check network connectivity
   - Ensure session token is valid

4. **Video not displaying**
   - Check video element references
   - Verify MediaStream attachment
   - Check browser console for errors

## 📚 Additional Resources

- [Samvyo SDK Documentation](https://docs.samvyo.com)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [React Documentation](https://reactjs.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the Samvyo SDK documentation
- Open an issue in the repository
- Contact Samvyo support team
