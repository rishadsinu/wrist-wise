





const loadHome = async (req, res) => {
    try {
        res.render('home')
    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    loadHome
}