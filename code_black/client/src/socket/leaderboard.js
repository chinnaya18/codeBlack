import { io } from "socket.io-client";
import { API_URL } from "../services/api";

export const socket = io(API_URL);

export function registerUser(username, role) {
  socket.emit("user:register", { username, role });
}
