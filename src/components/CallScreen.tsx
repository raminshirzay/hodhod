import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

interface CallScreenProps {
  call: {
    callId: number;
    isVideo: boolean;
    participants: any[];
    status: 'incoming' | 'active' | 'ended';
  };
  onEndCall: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({ call, onEndCall }) => {
  const { socket } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!call.isVideo);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (call.status === 'active') {
      initializeCall();
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [call.status]);

  useEffect(() => {
    if (socket) {
      socket.on('webrtc_offer', handleOffer);
      socket.on('webrtc_answer', handleAnswer);
      socket.on('webrtc_ice_candidate', handleIceCandidate);
      socket.on('call_ended', handleCallEnded);

      return () => {
        socket.off('webrtc_offer');
        socket.off('webrtc_answer');
        socket.off('webrtc_ice_candidate');
        socket.off('call_ended');
      };
    }
  }, [socket]);

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.isVideo,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsConnected(true);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            targetUserId: call.participants.find(p => p.id !== socket.userId)?.id
          });
        }
      };

      // Create offer if initiator
      if (call.participants[0].isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket?.emit('webrtc_offer', {
          offer,
          targetUserId: call.participants.find(p => p.id !== socket.userId)?.id
        });
      }
    } catch (error) {
      console.error('Error initializing call:', error);
    }
  };

  const handleOffer = async (data: any) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        socket?.emit('webrtc_answer', {
          answer,
          targetUserId: data.callerId
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data: any) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.answer);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (data: any) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(data.candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const handleCallEnded = () => {
    cleanup();
    onEndCall();
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const endCall = () => {
    socket?.emit('call_end', { callId: call.callId });
    cleanup();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (call.status === 'incoming') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full mx-4">
          <div className="mb-6">
            <img
              src={call.participants[0]?.avatar || 'https://ui-avatars.com/api/?name=User'}
              alt="Caller"
              className="w-24 h-24 rounded-full mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold text-gray-900">
              {call.participants[0]?.name || 'Unknown'} is calling...
            </h2>
            <p className="text-gray-600">
              {call.isVideo ? 'Video' : 'Voice'} call
            </p>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={onEndCall}
              className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                socket?.emit('call_response', {
                  callId: call.callId,
                  accepted: true,
                  callerId: call.participants[0]?.id
                });
              }}
              className="bg-green-500 text-white p-4 rounded-full hover:bg-green-600 transition-colors"
            >
              <Phone className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {call.isVideo && (
          <>
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white"
            />
          </>
        )}
        
        {!call.isVideo && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <img
                src={call.participants[0]?.avatar || 'https://ui-avatars.com/api/?name=User'}
                alt="Participant"
                className="w-32 h-32 rounded-full mx-auto mb-4"
              />
              <h2 className="text-2xl font-semibold mb-2">
                {call.participants[0]?.name || 'Unknown'}
              </h2>
              <p className="text-gray-300">
                {isConnected ? formatDuration(callDuration) : 'Connecting...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black bg-opacity-50 p-6">
        <div className="flex justify-center items-center space-x-6">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          
          {call.isVideo && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}
          
          <button
            onClick={endCall}
            className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          
          <button className="bg-gray-700 text-white p-4 rounded-full hover:bg-gray-600 transition-colors">
            <Volume2 className="h-6 w-6" />
          </button>
        </div>
        
        {call.status === 'active' && (
          <div className="text-center text-white mt-4">
            <p className="text-sm">{formatDuration(callDuration)}</p>
          </div>
        )}
      </div>
    </div>
  );
};