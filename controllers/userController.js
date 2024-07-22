





const loadHome = async (req, res) => {
    try {
        res.render('home');
    } catch (error) {
        console.log(error.message);
    }
}
//wishlist.html
const loadWishlist = async (req, res) => {
    try {
        res.render('wishlist');
    } catch (error) {
        console.log(error.message);
    }
}

const loadCart = async (req, res) => {
    try {
        res.render('cart');
    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    loadHome,
    loadWishlist,
    loadCart
}