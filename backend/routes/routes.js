const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, createBoard, myBoards, deleteBoard,
    createTicket, getTickets,deleteTicket, board,updateBoard,
    getSingleTicket,updateTicket,assignUserToTicket,
removeUserFromTicket,getUserProfile,updateUserProfile,
    deleteUser} = require('../controllers/controllers');


//User
router.post('/register', register);
router.post('/login', login);
router.get('/user-profile', authMiddleware, getUserProfile);
router.put('/update-profile', authMiddleware, updateUserProfile);
router.delete('/delete-user', authMiddleware, deleteUser);

// board
router.post('/create-board',authMiddleware, createBoard)
router.get('/users/:email/boards',authMiddleware, myBoards);
router.get('/:boardId',authMiddleware, board);
router.put('/:boardId',authMiddleware, updateBoard);
router.delete('/delete-board/:boardId',authMiddleware, deleteBoard);


//ticket
router.post('/create-ticket',authMiddleware, createTicket);
router.get('/tickets/:boardId',authMiddleware, getTickets);
router.get("/ticket/:ticketId", authMiddleware, getSingleTicket);
router.put("/tickets/:ticketId", authMiddleware, updateTicket);
router.delete('/delete-ticket/:ticketId',authMiddleware, deleteTicket);
router.put("/tickets/:ticketId/assign",authMiddleware, assignUserToTicket);
router.put("/tickets/:ticketId/remove",authMiddleware, removeUserFromTicket);


module.exports = router;