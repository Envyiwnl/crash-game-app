const mongoose = require('mongoose');

// userSchema

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        require: true,
        unique:true
    },

    wallet:{
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps:true
});

module.exports = mongoose.model('User',userSchema);