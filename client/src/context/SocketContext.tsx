import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const ORDER_ACTIVITY = 'ORDER_ACTIVITY'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'https://admin.fixzep.com'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinOrder: (orderId: string) => void
  leaveOrder: (orderId: string) => void
}

const SocketContext = createContext<SocketContextType | null>(null)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      socketInstance.emit('customer:join', { userId: user.id })
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('connect_error', () => {
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [user?.id])

  const joinOrder = useCallback((orderId: string) => {
    if (socket?.connected && orderId && userRef.current?.id) {
      socket.emit('order:join', { orderId, userId: userRef.current.id, role: 'customer' })
    }
  }, [socket])

  const leaveOrder = useCallback((orderId: string) => {
    if (socket?.connected && orderId) {
      socket.emit('order:leave', { orderId })
    }
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinOrder, leaveOrder }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  return context
}

export { ORDER_ACTIVITY }
