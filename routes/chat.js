const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route   GET /api/chat
// @desc    Get all chats for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true
    })
      .populate({
        path: 'participants',
        select: 'name avatar'
      })
      .populate('listing', 'title images')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json({ 
      success: true, 
      chats 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/chat
// @desc    Create or get existing chat
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { participantId, listingId } = req.body;

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, participantId] },
      listing: listingId || null,
      isActive: true
    })
      .populate('participants', 'name avatar')
      .populate('listing', 'title images');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [req.user.id, participantId],
        listing: listingId,
        isActive: true
      });

      await chat.save();
      
      // Populate after save
      chat = await Chat.findById(chat._id)
        .populate('participants', 'name avatar')
        .populate('listing', 'title images');
    }

    res.json({ 
      success: true, 
      chat 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/chat/:chatId
// @desc    Get chat details
// @access  Private
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
      isActive: true
    })
      .populate({
        path: 'participants',
        select: 'name avatar'
      })
      .populate('listing', 'title images currentPrice auctionEnd');

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    res.json({ 
      success: true, 
      chat 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/chat/:chatId/messages
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    // Verify user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.json({ 
      success: true, 
      messages 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/chat/:chatId/messages
// @desc    Send message in chat
// @access  Private
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { content, attachments } = req.body;

    // Verify user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found or inactive' 
      });
    }

    // Create message
    const message = new Message({
      chat: req.params.chatId,
      sender: req.user.id,
      content,
      attachments: attachments || []
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'name avatar');

    res.json({ 
      success: true, 
      message 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/chat/:chatId/read
// @desc    Mark messages as read
// @access  Private
router.put('/:chatId/read', auth, async (req, res) => {
  try {
    // Mark all unread messages as read
    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user.id },
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    res.json({ 
      success: true, 
      message: 'Messages marked as read' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/chat/:chatId
// @desc    Archive/delete chat
// @access  Private
router.delete('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      {
        _id: req.params.chatId,
        participants: req.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Chat archived' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;