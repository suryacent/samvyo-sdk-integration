import { useState, useEffect, useRef } from 'react'
// import samvyo from 'samvyo-js-sdk'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Square, 
  Circle, 
  Users, 
  Settings, 
  DoorOpen, 
  Phone, 
  PhoneOff, 
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
  MessageCircle,
  Share2,
  Link,
  FileText,
  Calendar,
  Star
} from 'lucide-react'
import './App.css'

function App() {
  // Core state
  const [roomId, setRoomId] = useState('')
  const [peerName, setPeerName] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // SDK instance
  const [vidScaleClient, setVidScaleClient] = useState(null)
  
  // Device management
  const [audioDevices, setAudioDevices] = useState([])
  const [videoDevices, setVideoDevices] = useState([])
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('')
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('')
  
  // Peers and media
  const [peers, setPeers] = useState(new Map())
  const [screenShares, setScreenShares] = useState(new Map())
  
  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [selectedChatReceiver, setSelectedChatReceiver] = useState('everyone')
  
  // Widget state
  const [showWidgets, setShowWidgets] = useState(false)
  const [selectedWidgetReceiver, setSelectedWidgetReceiver] = useState('everyone')
  const [widgetPopups, setWidgetPopups] = useState([])
  
  // Moderator features
  const [isModerator, setIsModerator] = useState(true) // Default as moderator
  const [authRequests, setAuthRequests] = useState([])
  
  // Refs for video elements
  const peerListRef = useRef(null)
  const screenShareListRef = useRef(null)
  const videoRefs = useRef(new Map())
  const audioRefs = useRef(new Map())
  const screenShareRefs = useRef(new Map())

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PARTICIPANTS_PER_PAGE = 10;

  // Calculate paginated peers
  const peerEntries = Array.from(peers.entries());
  const totalPages = Math.ceil(peerEntries.length / PARTICIPANTS_PER_PAGE) || 1;
  const paginatedPeers = peerEntries.slice(
    (currentPage - 1) * PARTICIPANTS_PER_PAGE,
    currentPage * PARTICIPANTS_PER_PAGE
  );

  // Responsive grid columns/rows based on number of participants on current page
  const getGridTemplate = () => {
    const count = paginatedPeers.length;
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 5, rows: 2 };
  };
  const { cols, rows } = getGridTemplate();

  // Configuration parameters (matching the reference code)
  const inputParams = {
    videoResolution: "hd",
    produce: true,
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
    backgroundImage: "",
    authenticationRequired: false,
    peerType: "moderator", // Default as moderator
    password: "",
  }

  // Get all devices
  const getAllDevices = async () => {
    try {
      const client = await samvyo.JsSdk
      const availableDevices = await client.listDevices()
      
      if (availableDevices.success) {
        const audioDevs = availableDevices.deviceList.audioDevices || []
        const videoDevs = availableDevices.deviceList.videoDevices || []
        
        setAudioDevices(audioDevs)
        setVideoDevices(videoDevs)
        
        // Set default selections
        if (audioDevs.length > 0) {
          setSelectedAudioDeviceId(audioDevs[0].deviceId)
        }
        if (videoDevs.length > 0) {
          setSelectedVideoDeviceId(videoDevs[0].deviceId)
        }
      }
    } catch (err) {
      setError(`Failed to get devices: ${err.message}`)
    }
  }

  // Change audio input device
  const changeAudioInput = async (deviceId) => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.changeAudioInput({ deviceId })
        setSelectedAudioDeviceId(deviceId)
      } catch (err) {
        setError(`Failed to change audio input: ${err.message}`)
      }
    }
  }

  // Change video input device
  const changeVideoInput = async (deviceId) => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.changeVideoInput({ deviceId })
        setSelectedVideoDeviceId(deviceId)
      } catch (err) {
        setError(`Failed to change video input: ${err.message}`)
      }
    }
  }

  // Fetch session token
  const fetchSessionToken = async (roomId) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('http://localhost:3000/api/create-session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.sessionToken || data.token
    } catch (err) {
      setError(`Failed to fetch session token: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Initialize SDK
  const initializeSDK = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Fetch session token
      const token = await fetchSessionToken(roomId)
      setSessionToken(token)

      // Initialize Samvyo SDK
      const client = await samvyo.JsSdk.init({
        sessionToken: token,
        roomId: roomId,
        peerName: peerName || 'Anonymous'
      })

      setVidScaleClient(client)

      // Set up all event listeners
      setupEventListeners(client)

      setIsInitialized(true)
      setError('')
    } catch (err) {
      setError(`Initialization failed: ${err.message}`)
      setIsInitialized(false)
    } finally {
      setLoading(false)
    }
  }

  // Setup all event listeners
  const setupEventListeners = (client) => {
    // Core events
    client.on('initSuccess', () => {
      console.log('SDK initialized successfully')
    })

    client.on('initError', (error) => {
      console.error('Error initializing SDK:', error)
      setError(`Initialization error: ${error.message || error}`)
    })

    client.on('joinSuccess', () => {
      console.log('Successfully joined room')
      setIsJoined(true)
      setError('')
      setLoading(false)
    })

    client.on('joinError', (error) => {
      console.error('Error joining room:', error)
      setError(`Join error: ${error.message || error}`)
      setIsJoined(false)
      setLoading(false)
    })

    // Peer events
    client.on('newPeer', ({ peerId, peerName, type }) => {
      console.log(`New peer joined: ${peerName} (ID: ${peerId})`)
      addPeer(peerId, peerName, type)
      
      // If it's a local peer, transition to room view
      if (type === 'local') {
        setIsJoined(true)
        setLoading(false)
      }
    })

    client.on('peerLeft', ({ peerId }) => {
      console.log(`Peer left: ${peerId}`)
      removePeer(peerId)
    })

    // Audio events
    client.on('micStart', ({ peerId, audioTrack, type }) => {
      console.log(`Mic started for peer: ${peerId}`)
      updatePeerAudio(peerId, audioTrack, type)
    })

    client.on('micEnd', ({ peerId }) => {
      console.log(`Mic ended for peer: ${peerId}`)
      removePeerAudio(peerId)
    })

    client.on('peerMuted', ({ peerId, type }) => {
      console.log(`Peer muted: ${peerId}`)
      updatePeerMuteStatus(peerId, true)
    })

    client.on('peerUnMuted', ({ peerId, type }) => {
      console.log(`Peer unmuted: ${peerId}`)
      updatePeerMuteStatus(peerId, false)
    })

    // Video events
    client.on('videoStart', ({ peerId, videoTrack, type }) => {
      console.log(`Video started for peer: ${peerId}`)
      updatePeerVideo(peerId, videoTrack, type)
      updatePeerCameraStatus(peerId, true)
    })

    client.on('videoEnd', ({ peerId, type }) => {
      console.log(`Video ended for peer: ${peerId}`)
      removePeerVideo(peerId, type)
      updatePeerCameraStatus(peerId, false)
    })

    // Screen share events
    client.on('ssVideoStart', ({ peerId, videoTrack, type }) => {
      console.log('Screen share video started')
      addScreenShare(peerId, videoTrack, type)
    })

    client.on('ssVideoStop', ({ peerId, videoTrack, type }) => {
      console.log('Screen share video stopped')
      removeScreenShare(peerId, videoTrack, type)
    })

    // Device events
    client.on('deviceListUpdated', () => {
      console.log('Device list updated')
      getAllDevices()
    })

    // Moderator events
    client.on('moderatorAuthentication', ({ moderatorName, requesterName, requesterPeerId, text }) => {
      console.log('Moderator authentication required')
      addAuthRequest({ requesterName, requesterPeerId, text, type: 'moderator' })
    })

    client.on('authenticationRequested', ({ moderatorName, requesterName, requesterPeerId, text }) => {
      console.log('Authentication required to join room')
      addAuthRequest({ requesterName, requesterPeerId, text, type: 'request' })
    })

    // Error and notification events
    client.on('error', ({ code, text }) => {
      console.error('Error code:', code, 'Error text:', text)
      setError(`Error ${code}: ${text}`)
    })

    client.on('notification', ({ eventType, eventText }) => {
      console.log('Notification:', eventType, eventText)
      setError(`${eventType}: ${eventText}`)
    })

    client.on('roomClosed', ({ roomId }) => {
      console.log('Room closed by moderator')
      removeAllPeers()
      setIsJoined(false)
      setIsInitialized(false)
      setVidScaleClient(null)
      setError('Room closed by moderator!')
    })

    
    client.on('customMessageError', (error) => {
      console.error('Custom message error:', error)
      setError(`Message error: ${error.error}`)
    })

    // Widget events
    client.on('customMessage', (message) => {
      console.log('Custom message received:', message)
      const isLocalMessage = message.from === client.data.inputParams.peerId
      
      // Check if it's a widget message
      if (message.type === 'widget' && !isLocalMessage) {
        addWidgetPopup({
          id: Date.now(),
          from: message.from,
          widgetType: message.customData?.widgetType,
          widgetData: message.customData?.widgetData,
          title: message.customData?.title,
          timestamp: new Date().toLocaleTimeString()
        })
      } else if (message.type === 'chat' && !isLocalMessage) {
        addChatMessage({
          id: Date.now(),
          from: message.from,
          data: message.data,
          type: message.type,
          messageType: message.messageType,
          customData: message.customData,
          timestamp: new Date().toLocaleTimeString()
        })
      }
    })
  }

  // Join room
  const joinRoom = async () => {
    if (!vidScaleClient || !isInitialized) {
      setError('SDK not initialized')
      return
    }

    try {
      setLoading(true)
      
      const params = {
        peerName: peerName || 'Anonymous',
        produce: true,
        consume: true,
        audioDeviceId: selectedAudioDeviceId,
        videoDeviceId: selectedVideoDeviceId,
        ...inputParams
      }

      console.log('Joining room with params:', params)
      await vidScaleClient.joinRoom(params)
    } catch (err) {
      setError(`Failed to join room: ${err.message}`)
      setLoading(false)
    }
  }

  // Leave room
  const leaveRoom = async () => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.leaveRoom()
        console.log('Left the room')
        setIsJoined(false)
        setIsInitialized(false)
        setVidScaleClient(null)
        removeAllPeers()
        setScreenShares(new Map())
        setIsRecording(false)
        // Clear all refs
        videoRefs.current.clear()
        audioRefs.current.clear()
        screenShareRefs.current.clear()
      } catch (err) {
        setError(`Failed to leave room: ${err.message}`)
      }
    }
  }

  // Close room (moderator only)
  const closeRoom = async () => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.closeRoom()
        console.log('Closed the room')
        setIsJoined(false)
        setIsInitialized(false)
        setVidScaleClient(null)
        removeAllPeers()
        setScreenShares(new Map())
        setIsRecording(false)
        // Clear all refs
        videoRefs.current.clear()
        audioRefs.current.clear()
        screenShareRefs.current.clear()
      } catch (err) {
        setError(`Failed to close room: ${err.message}`)
      }
    }
  }

  // Media controls
  const toggleMic = async () => {
    if (!vidScaleClient) return
    
    try {
      if (isMuted) {
        await vidScaleClient.unmuteMic()
        console.log('Microphone unmuted')
      } else {
        await vidScaleClient.muteMic()
        console.log('Microphone muted')
      }
      setIsMuted(!isMuted)
    } catch (err) {
      setError(`Failed to toggle microphone: ${err.message}`)
    }
  }

  const toggleCamera = async () => {
    if (!vidScaleClient) return
    
    try {
      if (isCameraOn) {
        await vidScaleClient.disableCam()
        console.log('Camera turned off')
      } else {
        await vidScaleClient.enableCam({ deviceId: selectedVideoDeviceId })
        console.log('Camera turned on')
      }
      setIsCameraOn(!isCameraOn)
    } catch (err) {
      setError(`Failed to toggle camera: ${err.message}`)
    }
  }

  const toggleScreenShare = async () => {
    if (!vidScaleClient) return
    
    try {
      if (isScreenSharing) {
        await vidScaleClient.disableShare()
        console.log('Screen share stopped')
      } else {
        await vidScaleClient.enableShare()
        console.log('Screen share started')
      }
      setIsScreenSharing(!isScreenSharing)
    } catch (err) {
      setError(`Failed to toggle screen share: ${err.message}`)
    }
  }

  const toggleRecording = async () => {
    if (!vidScaleClient) return
    
    try {
      if (isRecording) {
        await vidScaleClient.stopRecording()
        console.log('Recording stopped')
      } else {
        await vidScaleClient.startRecording({ recordingType: 'av' })
        console.log('Recording started')
      }
      setIsRecording(!isRecording)
    } catch (err) {
      setError(`Failed to toggle recording: ${err.message}`)
    }
  }

  // Peer management
  const addPeer = (peerId, peerName, type) => {
    setPeers(prev => {
      const newPeers = new Map(prev)
      if (!newPeers.has(peerId)) {
        newPeers.set(peerId, {
          peerName,
          type,
          muted: false,
          cameraOn: true,
          muteStatusMessage: '',
          camStatusMessage: ''
        })
      }
      return newPeers
    })
  }

  const removePeer = (peerId) => {
    setPeers(prev => {
      const newPeers = new Map(prev)
      newPeers.delete(peerId)
      return newPeers
    })
    
    // Clean up refs
    videoRefs.current.delete(peerId)
    audioRefs.current.delete(peerId)
  }

  const removeAllPeers = () => {
    setPeers(new Map())
    videoRefs.current.clear()
    audioRefs.current.clear()
  }

  const updatePeerMuteStatus = (peerId, isMuted) => {
    setPeers(prev => {
      const newPeers = new Map(prev)
      const peer = newPeers.get(peerId)
      if (peer) {
        peer.muted = isMuted
        peer.muteStatusMessage = isMuted ? 'Muted' : 'Unmuted'
      }
      return newPeers
    })
  }

  const updatePeerCameraStatus = (peerId, isOn) => {
    setPeers(prev => {
      const newPeers = new Map(prev)
      const peer = newPeers.get(peerId)
      if (peer) {
        peer.cameraOn = isOn
        peer.camStatusMessage = isOn ? 'Camera turned on' : 'Camera turned off'
      }
      return newPeers
    })
  }

  // Screen share management
  const addScreenShare = (peerId, videoTrack, type) => {
    setScreenShares(prev => {
      const newShares = new Map(prev)
      if (!newShares.has(peerId)) {
        newShares.set(peerId, { videoTrack, type })
      }
      return newShares
    })
  }

  const removeScreenShare = (peerId, videoTrack, type) => {
    setScreenShares(prev => {
      const newShares = new Map(prev)
      newShares.delete(peerId)
      return newShares
    })
    
    // Clean up screen share ref
    screenShareRefs.current.delete(peerId)
  }

  // Chat management
  const addChatMessage = (message) => {
    setChatMessages(prev => [...prev, message])
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !vidScaleClient) return

    try {
      const receiverPeerId = selectedChatReceiver === 'everyone' ? null : selectedChatReceiver
      
      
      addChatMessage({
        id: Date.now(),
        from: 'me',
        data: chatInput,
        type: 'chat',
        messageType: receiverPeerId ? 'private' : 'public',
        timestamp: new Date().toLocaleTimeString()
      })

      await vidScaleClient.sendCustomMessage(
        chatInput,
        'chat',
        receiverPeerId,
        'participant',
        receiverPeerId ? 'private' : 'public'
      )

      setChatInput('')
    } catch (err) {
      setError(`Failed to send message: ${err.message}`)
    }
  }

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }

  const getParticipantName = (peerId) => {
    if (peerId === 'me') return 'You'
    const peer = peers.get(peerId)
    return peer ? peer.peerName : `Peer ${peerId}`
  }

  // Widget management
  const addWidgetPopup = (widget) => {
    setWidgetPopups(prev => [...prev, widget])
  }

  const removeWidgetPopup = (widgetId) => {
    setWidgetPopups(prev => prev.filter(widget => widget.id !== widgetId))
  }

  const sendWidget = async (widgetType, widgetData, title) => {
    if (!vidScaleClient) return

    try {
      const receiverPeerId = selectedWidgetReceiver === 'everyone' ? null : selectedWidgetReceiver
      
      await vidScaleClient.sendCustomMessage(
        title || `Widget: ${widgetType}`,
        'widget',
        receiverPeerId,
        'moderator',
        receiverPeerId ? 'private' : 'public',
        {
          widgetType,
          widgetData,
          title
        }
      )
    } catch (err) {
      setError(`Failed to send widget: ${err.message}`)
    }
  }

  const predefinedWidgets = [
    {
      type: 'feedback',
      title: 'Meeting Feedback',
      icon: <Star size={20} />,
      data: {
        url: 'https://forms.google.com/demo-feedback',
        description: 'Share your thoughts about this meeting'
      }
    },
    {
      type: 'link',
      title: 'Meeting Resources',
      icon: <Link size={20} />,
      data: {
        url: 'https://docs.google.com/demo-resources',
        description: 'Access meeting materials and resources'
      }
    },
    {
      type: 'survey',
      title: 'Quick Survey',
      icon: <FileText size={20} />,
      data: {
        url: 'https://surveymonkey.com/demo-survey',
        description: 'Rate your experience and provide feedback'
      }
    },
    {
      type: 'calendar',
      title: 'Next Meeting',
      icon: <Calendar size={20} />,
      data: {
        url: 'https://calendar.google.com/demo-next-meeting',
        description: 'Schedule for follow-up discussion'
      }
    }
  ]

  // Moderator functions
  const addAuthRequest = (request) => {
    setAuthRequests(prev => [...prev, request])
  }

  const allowRoomJoin = async (requesterPeerId) => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.allowRoomJoin(requesterPeerId)
        setAuthRequests(prev => prev.filter(req => req.requesterPeerId !== requesterPeerId))
      } catch (err) {
        setError(`Failed to allow room join: ${err.message}`)
      }
    }
  }

  const denyRoomJoin = async (requesterPeerId) => {
    if (vidScaleClient) {
      try {
        await vidScaleClient.denyRoomJoin(requesterPeerId)
        setAuthRequests(prev => prev.filter(req => req.requesterPeerId !== requesterPeerId))
      } catch (err) {
        setError(`Failed to deny room join: ${err.message}`)
      }
    }
  }

  // Video/audio stream management - PRODUCTION IMPLEMENTATION
  const updatePeerVideo = (peerId, videoTrack, type) => {
    console.log(`Video track received for peer: ${peerId}`)
    
    // Get the video element for this peer
    const videoElement = videoRefs.current.get(peerId)
    if (videoElement && videoTrack) {
      try {
        // Create a new MediaStream with the video track
        const videoStream = new MediaStream()
        videoStream.addTrack(videoTrack)
        
        // Attach the stream to the video element
        videoElement.srcObject = videoStream
        
        // Play the video
        videoElement.play().catch(error => {
          console.warn(`Error playing video for peer ${peerId}:`, error)
        })
        
        console.log(`Video stream attached for peer: ${peerId}`)
      } catch (error) {
        console.error(`Error attaching video stream for peer ${peerId}:`, error)
      }
    }
  }

  const removePeerVideo = (peerId, type) => {
    console.log(`Video track removed for peer: ${peerId}`)
    
    const videoElement = videoRefs.current.get(peerId)
    if (videoElement) {
      videoElement.srcObject = null
    }
  }

  const updatePeerAudio = (peerId, audioTrack, type) => {
    console.log(`Audio track received for peer: ${peerId}`)
    
    // Only handle remote audio tracks
    if (type === 'remote') {
      const audioElement = audioRefs.current.get(peerId)
      if (audioElement && audioTrack) {
        try {
          // Create a new MediaStream with the audio track
          const audioStream = new MediaStream()
          audioStream.addTrack(audioTrack)
          
          // Attach the stream to the audio element
          audioElement.srcObject = audioStream
          
          // Play the audio
          audioElement.play().catch(error => {
            console.warn(`Error playing audio for peer ${peerId}:`, error)
          })
          
          console.log(`Audio stream attached for peer: ${peerId}`)
        } catch (error) {
          console.error(`Error attaching audio stream for peer ${peerId}:`, error)
        }
      }
    }
  }

  const removePeerAudio = (peerId) => {
    console.log(`Audio track removed for peer: ${peerId}`)
    
    const audioElement = audioRefs.current.get(peerId)
    if (audioElement) {
      audioElement.srcObject = null
    }
  }

  // Update screen share video
  const updateScreenShareVideo = (peerId, videoTrack) => {
    const videoElement = screenShareRefs.current.get(peerId)
    if (videoElement && videoTrack) {
      try {
        const videoStream = new MediaStream()
        videoStream.addTrack(videoTrack)
        
        videoElement.srcObject = videoStream
        videoElement.play().catch(error => {
          console.warn(`Error playing screen share video for peer ${peerId}:`, error)
        })
        
        console.log(`Screen share video stream attached for peer: ${peerId}`)
      } catch (error) {
        console.error(`Error attaching screen share video stream for peer ${peerId}:`, error)
      }
    }
  }

  // Load devices on component mount
  useEffect(() => {
    getAllDevices()
  }, [])

  // Effect to handle screen share video updates
  useEffect(() => {
    screenShares.forEach((share, peerId) => {
      if (share.videoTrack) {
        updateScreenShareVideo(peerId, share.videoTrack)
      }
    })
  }, [screenShares])

  // Calculate grid layout based on number of participants
  const getGridLayout = () => {
    const participantCount = peers.size
    if (participantCount <= 1) return 'grid-cols-1'
    if (participantCount <= 2) return 'grid-cols-2'
    if (participantCount <= 4) return 'grid-cols-2'
    if (participantCount <= 9) return 'grid-cols-3'
    return 'grid-cols-4'
  }

  return (
    <div className="meeting-room">
      {/* Header */}
      <header className="meeting-header">
        <div className="header-left">
          <h1>Samvyo Meeting</h1>
        </div>
        <div className="header-center">
          {isJoined && <span className="room-info">Room: {roomId}</span>}
          {isRecording && <span className="recording-indicator">Recording</span>}
        </div>
        <div className="header-right">
          {isJoined && (
            <div className="connection-status">
              <span className="status-dot connected"></span>
              Connected
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="meeting-content">
        {/* Video Area */}
        <div className="video-area">
          {!isJoined ? (
            <div className="join-screen">
              <div className="join-card">
                <h2>Join Meeting</h2>
                <p>Enter room details to start your video call</p>
                
                <div className="join-form">
                  <div className="input-field">
                    <label>Room ID</label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Enter room ID"
                      disabled={isInitialized}
                    />
                  </div>

                  <div className="input-field">
                    <label>Your Name</label>
                    <input
                      type="text"
                      value={peerName}
                      onChange={(e) => setPeerName(e.target.value)}
                      placeholder="Enter your name"
                      disabled={isInitialized}
                    />
                  </div>

                  {!isInitialized ? (
                    <button 
                      className="join-btn primary"
                      onClick={initializeSDK} 
                      disabled={loading || !roomId.trim()}
                    >
                      {loading ? 'Initializing...' : 'Initialize SDK'}
                    </button>
                  ) : (
                    <button 
                      className="join-btn primary"
                      onClick={joinRoom}
                      disabled={loading}
                    >
                      {loading ? 'Joining...' : 'Join Room'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="video-container">
              {/* Main Video Grid */}
              <div
                className="video-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gap: '12px',
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  alignItems: 'stretch',
                  justifyItems: 'stretch',
                  position: 'relative',
                  padding: '16px',
                  boxSizing: 'border-box',
                }}
                ref={peerListRef}
              >
                {paginatedPeers.map(([peerId, peer]) => (
                  <div
                    key={peerId}
                    className="video-item"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '0',
                      minWidth: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      aspectRatio: '16/9',
                    }}
                  >
                    <div
                      className="video-wrapper"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        aspectRatio: '16/9',
                        background: '#181e29',
                        borderRadius: 8,
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <video
                        ref={el => {
                          if (el) videoRefs.current.set(peerId, el);
                        }}
                        className="video-element"
                        autoPlay
                        playsInline
                        muted={peer.type === 'local'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          background: '#181e29',
                        }}
                      />
                      <audio
                        ref={el => {
                          if (el) audioRefs.current.set(peerId, el);
                        }}
                        className="audio-element"
                        autoPlay
                        playsInline
                      />
                      {/* Video Overlay */}
                      <div className="video-overlay">
                        <div className="participant-info">
                          <span className="participant-name">
                            {peer.peerName}
                            {peer.type === 'local' && <span className="local-indicator"> (You)</span>}
                            {peer.type === 'local' && isModerator && <span className="moderator-indicator"> (Moderator)</span>}
                          </span>
                        </div>
                        {/* Status Indicators */}
                        <div className="status-indicators">
                          {peer.muted && (
                            <div className="status-badge muted">
                              <MicOff size={16} />
                            </div>
                          )}
                          {!peer.cameraOn && (
                            <div className="status-badge camera-off">
                              <VideoOff size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '12px 0' }}>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ marginRight: 8 }}
                  >
                    Prev
                  </button>
                  <span style={{ color: '#94a3b8', fontSize: 14, margin: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ marginLeft: 8 }}
                  >
                    Next
                  </button>
                </div>
              )}
              
              {/* Screen Share Area */}
              {screenShares.size > 0 && (
                <div className="screen-share-area">
                  <div className="screen-share-header">
                    <h3>Screen Share</h3>
                  </div>
                  <div className="screen-share-grid">
                    {Array.from(screenShares.entries()).map(([peerId, share]) => (
                      <div key={`ss-${peerId}`} className="screen-share-item">
                        <video 
                          ref={(el) => {
                            if (el) screenShareRefs.current.set(peerId, el)
                          }}
                          className="screen-share-video" 
                          autoPlay 
                          playsInline
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="controls-panel">
          <div className="control-buttons">
            {isJoined ? (
              <>
                <button 
                  className={`control-btn mic-btn ${isMuted ? 'muted' : ''}`}
                  onClick={toggleMic}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button 
                  className={`control-btn camera-btn ${!isCameraOn ? 'camera-off' : ''}`}
                  onClick={toggleCamera}
                  title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                  <span>{isCameraOn ? 'Camera' : 'Camera Off'}</span>
                </button>
                <button 
                  className={`control-btn screen-share-btn ${isScreenSharing ? 'active' : ''}`}
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                  {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                  <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                </button>
                <button 
                  className={`control-btn recording-btn ${isRecording ? 'active' : ''}`}
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <Square size={20} /> : <Circle size={20} />}
                  <span>{isRecording ? 'Stop' : 'Record'}</span>
                </button>
                <button 
                  className="control-btn participants-btn"
                  onClick={() => setShowParticipants(!showParticipants)}
                  title="Participants"
                >
                  <Users size={20} />
                  <span>Participants ({peers.size})</span>
                </button>
                <button 
                  className={`control-btn chat-btn ${showChat ? 'active' : ''}`}
                  onClick={() => setShowChat(!showChat)}
                  title="Chat"
                >
                  <MessageCircle size={20} />
                  <span>Chat</span>
                </button>
                {isModerator && (
                  <button 
                    className={`control-btn widgets-btn ${showWidgets ? 'active' : ''}`}
                    onClick={() => setShowWidgets(!showWidgets)}
                    title="Share Widgets"
                  >
                    <Share2 size={20} />
                    <span>Widgets</span>
                  </button>
                )}
                <button 
                  className="control-btn settings-btn" 
                  onClick={() => setShowSettings(!showSettings)}
                  title="Settings"
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </button>
                {isModerator && (
                  <button 
                    className="control-btn close-room-btn"
                    onClick={closeRoom}
                    title="Close room"
                  >
                    <DoorOpen size={20} />
                    <span>Close Room</span>
                  </button>
                )}
                <button 
                  className="control-btn leave-btn" 
                  onClick={leaveRoom}
                  title="Leave meeting"
                >
                  <PhoneOff size={20} />
                  <span>Leave</span>
                </button>
              </>
            ) : (
              <div className="setup-controls">
                <button 
                  className="control-btn settings-btn" 
                  onClick={() => setShowSettings(!showSettings)}
                  title="Device settings"
                >
                  <Settings size={20} />
                  <span>Device Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Device Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="settings-content">
              <div className="device-section">
                <h4>Audio Input</h4>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => changeAudioInput(e.target.value)}
                  className="device-select"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="device-section">
                <h4>Video Input</h4>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => changeVideoInput(e.target.value)}
                  className="device-select"
                >
                  {videoDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={getAllDevices} className="refresh-btn">
                <RefreshCw size={16} />
                Refresh Devices
              </button>
            </div>
          </div>
        )}

        {/* Participants List */}
        {showParticipants && (
          <div className="participants-list">
            <div className="participants-header">
              <h3>Participants ({peers.size})</h3>
              <button className="close-btn" onClick={() => setShowParticipants(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="participants-content">
              {Array.from(peers.entries()).map(([peerId, peer]) => (
                <div key={peerId} className="participant-item">
                  <div className="participant-info">
                    <span className="participant-name">
                      {peer.peerName}
                      {peer.type === 'local' && <span className="local-indicator"> (You)</span>}
                      {peer.type === 'local' && isModerator && <span className="moderator-indicator"> (Moderator)</span>}
                    </span>
                    <div className="participant-status">
                      {peer.muted && <MicOff size={14} />}
                      {!peer.cameraOn && <VideoOff size={14} />}
                    </div>
                  </div>
                </div>
              ))}
              {peers.size === 0 && (
                <p className="no-participants">No participants yet</p>
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="chat-panel">
            <div className="chat-header">
              <h3>Chat</h3>
              <button className="close-btn" onClick={() => setShowChat(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="chat-content">
              {/* Chat Messages */}
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <p className="no-messages">No messages yet. Start the conversation!</p>
                ) : (
                  chatMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.from === 'me' ? 'sent' : 'received'}`}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {getParticipantName(message.from)}
                        </span>
                        <span className="message-time">{message.timestamp}</span>
                      </div>
                      <div className="message-content">
                        {message.data}
                      </div>
                      {message.messageType === 'private' && (
                        <div className="message-type">
                          <span className="private-indicator">Private</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {/* Chat Input */}
              <div className="chat-input-section">
                <div className="chat-receiver-select">
                  <label>Send to:</label>
                  <select
                    value={selectedChatReceiver}
                    onChange={(e) => setSelectedChatReceiver(e.target.value)}
                    className="receiver-select"
                  >
                    <option value="everyone">Everyone</option>
                    {Array.from(peers.entries())
                      .filter(([peerId, peer]) => peer.type !== 'local') // Exclude local participant
                      .map(([peerId, peer]) => (
                        <option key={peerId} value={peerId}>
                          {peer.peerName}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div className="chat-input-container">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    placeholder="Type your message..."
                    className="chat-input"
                    rows={3}
                  />
                  <button 
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className="send-message-btn"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Widgets Panel */}
        {showWidgets && (
          <div className="widgets-panel">
            <div className="widgets-header">
              <h3>Share Widgets</h3>
              <button className="close-btn" onClick={() => setShowWidgets(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="widgets-content">
              <div className="widget-receiver-select">
                <label>Send to:</label>
                <select
                  value={selectedWidgetReceiver}
                  onChange={(e) => setSelectedWidgetReceiver(e.target.value)}
                  className="receiver-select"
                >
                  <option value="everyone">Everyone</option>
                  {Array.from(peers.entries())
                    .filter(([peerId, peer]) => peer.type !== 'local')
                    .map(([peerId, peer]) => (
                      <option key={peerId} value={peerId}>
                        {peer.peerName}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="widgets-list">
                {predefinedWidgets.map((widget) => (
                  <div key={widget.type} className="widget-item">
                    <div className="widget-icon">
                      {widget.icon}
                    </div>
                    <div className="widget-info">
                      <span className="widget-title">{widget.title}</span>
                      <span className="widget-description">
                        {widget.data.description || `${widget.data.questions?.length || 0} questions`}
                      </span>
                    </div>
                    <button 
                      onClick={() => sendWidget(widget.type, widget.data, widget.title)}
                      className="send-widget-btn"
                      title={`Send ${widget.title}`}
                    >
                      Send
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Widget Popups */}
        {widgetPopups.map((widget) => (
          <div key={widget.id} className="widget-popup">
            <div className="widget-popup-header">
              <h4>{widget.title}</h4>
              <button 
                className="close-btn" 
                onClick={() => removeWidgetPopup(widget.id)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="widget-popup-content">
              <p className="widget-popup-description">
                {widget.widgetData.description}
              </p>
              <a 
                href={widget.widgetData.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="widget-popup-link"
              >
                {widget.widgetType === 'feedback' && 'Take Feedback'}
                {widget.widgetType === 'link' && 'View Resources'}
                {widget.widgetType === 'survey' && 'Take Survey'}
                {widget.widgetType === 'calendar' && 'Add to Calendar'}
              </a>
            </div>
          </div>
        ))}

        {/* Authentication Requests */}
        {authRequests.length > 0 && (
          <div className="auth-requests-panel">
            <div className="auth-requests-header">
              <h3>Authentication Requests</h3>
            </div>
            <div className="auth-requests-content">
              {authRequests.map((request, index) => (
                <div key={index} className="auth-request-item">
                  <span>{request.text}</span>
                  {request.type === 'moderator' && (
                    <div className="auth-buttons">
                      <button onClick={() => allowRoomJoin(request.requesterPeerId)}>
                        Allow
                      </button>
                      <button onClick={() => denyRoomJoin(request.requesterPeerId)}>
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-toast">
          <AlertTriangle size={16} />
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <Loader2 size={40} className="loading-spinner" />
          <p>Connecting to meeting...</p>
        </div>
      )}
    </div>
  )
}

export default App
