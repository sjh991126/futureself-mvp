import api, { API_BASE_URL, TokenManager } from '../config';
import { addParticipants, createChatRoom, getChatRoomByTripListId } from './chat';
import { incrementUserPoints } from './userPoints';

const API_URL = `/api/triplists/collaborators/v1`;

// Send collaborate request to users
export const sendCollaborateRequest = async (data) => {
    try {
        console.log('data', data);
        const response = await api.post(
            `${API_URL}/request`,
            data
        );

        // Check if the status code is 200
        if (response.status === 200) {
            console.log('Collaborate request sent successfully');

            // Award points after successful collaboration request
            try {
                await incrementUserPoints(10);
                console.log('Collaboration points awarded: +10 points');
            } catch (pointsError) {
                console.warn('Points system not available, collaboration request sent successfully');
                // Don't throw here - collaboration was successful, points update is secondary
            }

            return true;
        } else {
            console.log('Collaborate request failed');
            return false;
        }
    } catch (error) {
        console.error('Error sending collaborate request:', error);
        return false;
    }
};



export const acceptCollaboratorRequest = async (tripListId, senderId, participantId) => {
    try {
        // 1. 협업 요청 수락
        const response = await api.put(
            `${API_URL}/accept/${tripListId}`,
            {}
        );

        if (response.status !== 200) {
            throw new Error('Failed to accept collaborator request');
        }

        // 2. 채팅방 처리 
        try {
            await setupChatRoom(tripListId, senderId, participantId);
        } catch (chatError) {
            console.warn('Chat room setup failed, but collaboration accepted:', chatError);
        }

        return response.data;
    } catch (error) {
        console.error('Error accepting collaborator request:', error);
        throw error;
    }
};

// collaborateRequest.js - Replace setupChatRoom
const setupChatRoom = async (tripListId, senderId, participantId) => {
    try {
        // Validate inputs
        if (!tripListId || !senderId || !participantId) {
            throw new Error('Missing required parameters for chat room setup');
        }

        // Get current user
        const userData = await TokenManager.getUserData();
        if (!userData?.id) {
            throw new Error('User ID not found');
        }

        let chatRoom = null;

        // Check for existing chat room
        try {
            chatRoom = await getChatRoomByTripListId(tripListId);
            console.log('Found existing chat room:', chatRoom?.id);
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                console.log('No existing chat room found');
                chatRoom = null;
            } else {
                throw error;
            }
        }

        if (chatRoom?.id) {
            // Add participant to existing room
            console.log('Adding participant to existing chat room:', participantId);
            await addParticipants(chatRoom.id, [participantId]);
            console.log('✅ Participant added to existing chat room');
        } else {
            // Create new chat room
            console.log('Creating new chat room for tripList:', tripListId);

            // Remove duplicates from participant list
            const participantIds = Array.from(new Set([
                userData.id,
                senderId,
                participantId
            ]));

            const chatRoomRequest = {
                tripListId: tripListId,
                participantIds: participantIds,
            };

            const newChatRoom = await createChatRoom(chatRoomRequest);
            console.log('✅ New chat room created:', newChatRoom?.id);
        }
    } catch (error) {
        console.error('Error in setupChatRoom:', error);
        // Log but don't throw - collaboration is more important than chat
        console.warn('Chat room setup failed, but collaboration can continue');
    }
};

export const declineCollaboratorRequest = async (tripListId) => {
    try {
        const response = await api.delete(
            `${API_URL}/request/${tripListId}`,
        );

        if (response.status === 200) {
            return true;
        } else {
            throw new Error('Failed to decline request');
        }
    } catch (error) {
        console.error('Error declining collaborator request:', error);
        throw error;
    }
};
