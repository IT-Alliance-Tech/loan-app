"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { getUserFromToken, getToken } from "../utils/auth";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const user = getUserFromToken();

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    // Detect API Base URL consistently with api.js
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL === "undefined" || !process.env.NEXT_PUBLIC_API_BASE_URL
      ? 'http://localhost:5000'
      : process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const response = await fetch(`${apiBase}/api/notifications?limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      // Avoid spamming the console for background polling errors
      if (error.message !== 'Failed to fetch') {
        console.error("Error fetching notifications:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      newSocket.emit("join", user._id);
    });

    newSocket.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 5));
      // Try to play a subtle sound or something here if needed
    });

    newSocket.on("unread_count", (count) => {
      setUnreadCount(count);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [user?._id]);

  // Polling fallback to ensure notifications are updated even if socket fails
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const token = getToken();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL === "undefined" || !process.env.NEXT_PUBLIC_API_BASE_URL
      ? 'http://localhost:5000'
      : process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      await fetch(`${apiBase}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local state is handled by socket or we can do it manually
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
