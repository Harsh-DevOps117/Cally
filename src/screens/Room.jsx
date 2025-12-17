import {
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Send,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer";

const RoomPage = () => {
  const notify = (msg) => toast(msg);

  const Navigate = useNavigate();
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const chatEndRef = useRef(null);

  const isSettingUpCall = useRef(false);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null); // FIX: Add Ref for Local Video

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`User joined: ${id}`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    isSettingUpCall.current = true;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    setIsMuted(false);
    setIsVideoOff(false);

    for (const track of stream.getTracks()) {
      peer.peer.addTrack(track, stream);
    }

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });

    setTimeout(() => {
      isSettingUpCall.current = false;
    }, 2000);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      isSettingUpCall.current = true;
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      setIsMuted(false);
      setIsVideoOff(false);

      for (const track of stream.getTracks()) {
        peer.peer.addTrack(track, stream);
      }

      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });

      setTimeout(() => {
        isSettingUpCall.current = false;
      }, 2000);
    },
    [socket]
  );

  const handleCallAccepted = useCallback(async ({ from, ans }) => {
    await peer.setLocalDescription(ans);
    console.log("Call Accepted!");
  }, []);

  const handleNegoNeeded = useCallback(async () => {
    if (isSettingUpCall.current) return;
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    const handleIceCandidate = (event) => {
      if (event.candidate && remoteSocketId) {
        socket.emit("peer:ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };
    peer.peer.addEventListener("icecandidate", handleIceCandidate);
    return () => {
      peer.peer.removeEventListener("icecandidate", handleIceCandidate);
    };
  }, [socket, remoteSocketId]);

  const handleIncomingIceCandidate = useCallback(async ({ candidate }) => {
    try {
      if (candidate) {
        await peer.peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error("Error adding ice candidate", e);
    }
  }, []);

  useEffect(() => {
    const handleTrackEvent = (ev) => {
      setRemoteStream(ev.streams[0]);
    };
    peer.peer.addEventListener("track", handleTrackEvent);
    return () => {
      peer.peer.removeEventListener("track", handleTrackEvent);
    };
  }, []);

  // --- VIDEO REF HANDLING ---

  // 1. Handle Remote Video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 2. Handle Local Video (FIX for Screen Share visibility)
  useEffect(() => {
    if (localVideoRef.current && myStream) {
      localVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("peer:ice-candidate", handleIncomingIceCandidate);
    socket.on("chat:message", (message) => {
      setMessages((prev) => [...prev, { ...message, isMe: false }]);
    });

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("peer:ice-candidate", handleIncomingIceCandidate);
      socket.off("chat:message");
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    handleIncomingIceCandidate,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- CONTROLS ---

  const toggleMute = useCallback(() => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [myStream]);

  const toggleVideo = useCallback(() => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [myStream]);

  const handleLeaveRoom = useCallback(() => {
    try {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.error("Error stopping tracks", e);
    }

    setMyStream(null);
    socket.emit("room:leave");
    notify("Leaving room...");
    Navigate("/");
    window.location.href = "/";
  }, [myStream, socket, Navigate]);

  const shareScreen = async () => {
    try {
      if (isScreenSharing) {
        // STOP SHARE
        const screenTrack = myStream.getVideoTracks()[0];
        if (screenTrack) screenTrack.stop();

        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = peer.peer
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) await sender.replaceTrack(videoTrack);

        const audioTrack = cameraStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !isMuted;

        setMyStream(cameraStream);
        setIsScreenSharing(false);
      } else {
        // START SHARE
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = async () => {
          // Logic when user clicks "Stop Sharing" in browser UI
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          const videoTrack = cameraStream.getVideoTracks()[0];
          const sender = peer.peer
            .getSenders()
            .find((s) => s.track.kind === "video");
          if (sender) await sender.replaceTrack(videoTrack);
          setMyStream(cameraStream);
          setIsScreenSharing(false);
        };

        const sender = peer.peer
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);

        // Mix Audio + Screen
        const tracks = [screenTrack];
        if (myStream && myStream.getAudioTracks()[0]) {
          tracks.push(myStream.getAudioTracks()[0]);
        }
        const mixedStream = new MediaStream(tracks);

        setMyStream(mixedStream); // Triggers useEffect to update localVideoRef
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Screen share error", error);
      setIsScreenSharing(false);
    }
  };

  const sendMessage = () => {
    if (messageInput.trim() && remoteSocketId) {
      const message = {
        text: messageInput,
        timestamp: new Date().toISOString(),
        isMe: true,
      };
      setMessages((prev) => [...prev, message]);
      socket.emit("chat:message", { to: remoteSocketId, text: messageInput });
      setMessageInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <header className="px-4 py-3 flex items-center justify-between backdrop-blur-xl bg-black/30 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <div
            className={`h-2 w-2 rounded-full ${
              remoteSocketId ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          <span className="text-sm font-medium">
            {remoteSocketId ? "Connected" : "Waiting..."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {remoteSocketId && !myStream && (
            <button
              onClick={handleCallUser}
              className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition-all duration-300 flex items-center gap-2"
            >
              <Video size={16} /> Start Call
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="flex-1 rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-white/10 relative mb-3 min-h-0">
            {remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">Remote</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Users size={32} className="text-white/40" />
                </div>
                <p className="text-white/40 text-sm">
                  {remoteSocketId ? "Waiting for video..." : "No participants"}
                </p>
              </div>
            )}

            {/* LOCAL VIDEO (PIP) */}
            {myStream && (
              <div className="absolute bottom-3 right-3 w-48 h-36 rounded-lg overflow-hidden bg-black border-2 border-white/20 shadow-2xl">
                {/* FIX: Using native video for Local Video to ensure screen share visibility */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted // Always mute local video to prevent feedback
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-medium flex items-center gap-1">
                  {isScreenSharing && <Monitor size={10} />}
                  You
                </div>
                {isVideoOff && !isScreenSharing && (
                  <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                    <VideoOff size={24} className="text-white/60" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 py-2 px-4 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 shrink-0">
            {myStream ? (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-all cursor-pointer ${
                    isMuted
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-white/10 hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-all cursor-pointer ${
                    isVideoOff
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-white/10 hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>

                <button
                  onClick={shareScreen}
                  className={`p-3 rounded-full transition-all cursor-pointer ${
                    isScreenSharing
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-white/10 hover:bg-white/20 border border-white/20"
                  }`}
                >
                  <Monitor size={20} />
                </button>

                <button
                  onClick={handleLeaveRoom}
                  className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg cursor-pointer"
                >
                  <PhoneOff size={20} />
                </button>
              </>
            ) : (
              <div className="text-white/40 text-sm py-2">
                Start a call to use controls
              </div>
            )}
          </div>
        </div>

        <div className="w-80 flex flex-col border-l border-white/10 bg-black/20 shrink-0">
          <div className="px-4 py-3 border-b border-white/10 shrink-0">
            <h3 className="font-semibold text-sm">Chat</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.isMe
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-white"
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-white/30 placeholder-white/40"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || !remoteSocketId}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-white/5 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
