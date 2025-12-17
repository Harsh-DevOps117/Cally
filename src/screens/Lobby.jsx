import { LogIn, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-50"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-10 rounded-2xl shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-6 shadow-lg hover:scale-105 transition-transform duration-300">
              <Video className="text-black" size={32} />
            </div>
            <h1 className="text-4xl italic font-bold tracking-tight mb-2">
              Cally
            </h1>
            <p className="text-white/50 text-sm">
              Connect face-to-face, anywhere in the world
            </p>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-white/70 block"
              >
                Email Address
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all hover:bg-white/10"
                type="email"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="room"
                className="text-sm font-medium text-white/70 block"
              >
                Room Code
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all hover:bg-white/10"
                type="text"
                id="room"
                placeholder="Enter room code"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                required
              />
            </div>
            <button className="w-full bg-white text-black font-semibold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 transition-all duration-300 hover:bg-gray-200 active:scale-[0.98] mt-8">
              <LogIn size={20} />
              Join Room
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-4 text-white/40 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                Secure
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                P2P
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-white/30 text-sm mt-6">
          Create or join a room to start your video call
        </p>
      </div>
    </div>
  );
};

export default LobbyScreen;
