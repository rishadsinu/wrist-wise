
const Wallet = require('../../models/walletModel');
const Order = require('../../models/orderModel');

const loadWallet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        const user = req.session.user;
        let wallet = await Wallet.findOne({ user: user._id });

        if (!wallet) {
            wallet = new Wallet({ user: user._id, balance: 0, transactions: [] });
        }

        const page = parseInt(req.query.page) || 1;  
        const limit = parseInt(req.query.limit) || 6;  
        const totalTransactions = wallet.transactions.length; 
        const totalPages = Math.ceil(totalTransactions / limit);  

        const paginatedTransactions = wallet.transactions
            .sort((a, b) => b.date - a.date) 
            .slice((page - 1) * limit, page * limit);  

        const orders = await Order.find({ userId: user._id }).populate('items.product');

        for (let order of orders) {
            for (let item of order.items) {
                const isAlreadyProcessed = wallet.transactions.some(
                    (transaction) => transaction.transactionId === `${order._id}-${item.product._id}`
                );

                if (!isAlreadyProcessed) {
                    if (item.order_status === 'Returned' || item.order_status === 'Cancelled') {
                        const refundAmount = item.price * item.quantity; 
                        wallet.transactions.push({
                            transactionId: `${order._id}-${item.product._id}`,
                            description: `${item.order_status} Refund`,
                            amount: refundAmount,
                            type: 'credit',
                            date: new Date()
                        });
                        wallet.balance += refundAmount;
                    }
                }
            }
        }

        await wallet.save();

        res.render('wallet', {
            user,
            wallet: wallet,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error loading wallet:', error);
        res.status(500).send('Server error: ' + error.message);
    }
};


module.exports = {
    loadWallet,
};