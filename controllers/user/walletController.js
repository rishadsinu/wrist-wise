
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
            await wallet.save();
        }
        const orders = await Order.find({ userId: user._id }).populate('items.product');

        for (let order of orders) {
            for (let item of order.items) {
                const isAlreadyCredited = wallet.transactions.some(
                    (transaction) => transaction.transactionId === item.product._id.toString()
                );

                if (!isAlreadyCredited) {
                    if (item.order_status === 'Returned') {
                        wallet.transactions.push({
                            transactionId: item.product._id.toString(),
                            description: 'Return Refund',
                            amount: item.price,
                            type: 'credit',
                        });
                        wallet.balance += item.price;
                    } else if (item.order_status === 'Cancelled') {
                        wallet.transactions.push({
                            transactionId: item.product._id.toString(),
                            description: 'Cancel Refund',
                            amount: item.price,
                            type: 'credit',
                        });
                        wallet.balance += item.price;
                    }
                }
            }
        }
        await wallet.save();

        res.render('wallet', {
            user,
            wallet: wallet,
            transactions: wallet.transactions,
        });
    } catch (error) {
        console.error('Error loading wallet:', error);
        res.status(500).send('Server error: ' + error.message);
    }
};

module.exports = {
    loadWallet,
};


