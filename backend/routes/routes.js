const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../Uploads/uploads');
const { register, login, createBoard, myBoards, deleteBoard,
    createTicket, getTickets,deleteTicket, board,updateBoard,
    getSingleTicket,updateTicket,assignUserToTicket,
removeUserFromTicket,getUserProfile,updateUserProfile,
    deleteUser,getNotifications,createNotification,markNotificationRead, deleteNotification,
generateTicketsFromPrompt,getMyTickets, getUserBasicInfoById,addComment,
    getCommentsForTicket,deleteComment,getTicketAssignees,
generateDailyStandup,getMyTicketsForBoard} = require('../controllers/controllers');


//User
router.post('/register', register);
router.post('/login', login);
router.get('/user-profile', authMiddleware, getUserProfile);
router.put('/update-profile', authMiddleware, updateUserProfile);
router.delete('/delete-user', authMiddleware, deleteUser);
router.get('/user/:userID/basic-info', getUserBasicInfoById);


//ticket
router.post('/create-ticket',authMiddleware, createTicket);
router.get("/my-tickets", authMiddleware, getMyTickets);
router.get("/my-tickets/:boardId", authMiddleware, getMyTicketsForBoard);
router.get('/tickets/:boardId',authMiddleware, getTickets);
router.get("/ticket/:ticketId", authMiddleware, getSingleTicket);
router.put("/tickets/:ticketId", authMiddleware, updateTicket);
router.delete('/delete-ticket/:ticketId',authMiddleware, deleteTicket);
router.put("/tickets/:ticketId/assign",authMiddleware, assignUserToTicket);
router.put("/tickets/:ticketId/remove",authMiddleware, removeUserFromTicket);
router.get('/tickets/:ticketId/assignees', authMiddleware, getTicketAssignees);


// board
router.post('/create-board',authMiddleware, createBoard)
router.get('/users/:email/boards',authMiddleware, myBoards);
router.get('/:boardId',authMiddleware, board);
router.put('/:boardId',authMiddleware, updateBoard);
router.delete('/delete-board/:boardId',authMiddleware, deleteBoard);


//notifications
router.get('/notifications/:userId',authMiddleware, getNotifications);
router.post('/notifications/create',authMiddleware, createNotification);
router.patch('/:notificationId/mark-read',authMiddleware, markNotificationRead);
router.delete('/:notificationId',authMiddleware, deleteNotification);


//AI assistant
router.post("/ai-helper/:boardId", authMiddleware, generateTicketsFromPrompt);
router.get("/ai-standup/:boardId", authMiddleware, generateDailyStandup);



// Comments
router.post('/tickets/:ticketId/comments', authMiddleware, upload.single('attachment'), addComment);
router.get('/tickets/:ticketId/comments', authMiddleware, getCommentsForTicket);
router.delete('/tickets/:ticketId/comments/:commentId',authMiddleware, deleteComment);

module.exports = router;