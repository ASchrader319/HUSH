const Confession = require('../models/confession');
const User = require('../models/user');
const _ = require('lodash');
const addConfessionValidator = require('../validators/addConfession');
const { findOne, findById } = require('../models/user');


//add confession
exports.addConfession = async (req, res) => {
    const validationResult = addConfessionValidator(req.body);
    let ID = await User.findById(req.session.userId)
    if(validationResult !== true){
        return res.status(400).json({message: validationResult});
    }

    const confession = await Confession.create({...req.body, userID: ID, deleted: 0});

    return res.status(201)
    .json({
        message: "confession posted", 
        confession: confession.toObject()
    });
}

// delete confession 
exports.deleteConfession = async (req, res) => {
    confession = await Confession.findById(req.params.id);
    // Confession.findById(req.body.confessionID); if we want the confessionID in the body of the request instead (change route to remove /:id)

    user = await User.findById(req.session.userId);
    if(user.moderator){
        confession.deleted = -1;
        return res.status(201).json({message: "This post was deleted by a moderator"});
    }
    else if(!user.moderator){
        confession.deleted = 1;
        return res.status(201).json({message: "This post was deleted successfully"});
    }
}

//search confession
exports.searchConfession = async (req, res) => {
    // Input: usrID and search criteria
    let ID = await User.findById(req.session.userId)
    // (confessionsarr[] = Confession.findAll({deleted: {$eq 0}}, {$all: req.body})) // query likely wrong
    // Output: array of confessions objects matching search criteria
    let resultsPerPage = 15;
    let searchVar = req.body.searchVal;
    //if searchVar==1, sort by most recent 
    if(searchVar==1){
        searchResults = await Confession.find(
            {
                "userID": ID
            }).
            limit(resultsPerPage).sort({timestamps: -1});
    }

    //if searchVar==2, sort by most popular
    if(searchVar==2){
        searchResults = await Confession.find(
            {
                "userID": ID
            }).
            limit(resultsPerPage).sort({timestamps: -1,netVotes:1});
    }

    
    
    res.status(201).json(searchResults);
}

//change vote
// TODO: fix bug where a user can be added to the userInteracted array multiple times
exports.changeVote = async (req, res) => {
    confession = await Confession.findById(req.params.id);

    if(confession.deleted === 1 || confession.deleted === -1)
        return res.status(404).json({message: "post not found"});

    voterID = req.body.userID;
    // we want to upvote
    if(req.body.vote === 1){
        if(confession.downvoteList.includes(voterID)){
            confession.downvoteList.pull(voterID);
            confession.upvoteList.push(voterID);
            confession.update({
                userID: voterID, "userInteracted.userID": voterID}, 
                {$set: {"userInteracted.interaction": 1}
            });
            await confession.save();

            return res.status(201).json({
                message: "vote changed from downvote to upvote",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
        else if(confession.upvoteList.includes(voterID)){
            confession.upvoteList.pull(voterID);
            confession.update({
                userID: voterID, "userInteracted.userID": voterID}, 
                {$set: {"userInteracted.interaction": 0}
            });
            await confession.save();

            return res.status(201).json({
                message: "vote changed from upvote to none",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
        else{
            confession.upvoteList.push(voterID);
            confession.userInteracted.push({userID: voterID, "interaction": 1});
            await confession.save();

            return res.status(201).json({
                message: "vote added as upvote",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
    }
    else if(req.body.vote === -1){ // we want to downvote post
        if(confession.upvoteList.includes(voterID)){
            confession.upvoteList.pull(voterID);
            confession.downvoteList.push(voterID);
            confession.update({
                userID: voterID, "userInteracted.userID": voterID}, 
                {$set: {"userInteracted.interaction": -1}
            });
            await confession.save();

            return res.status(201).json({
                message: "vote changed from upvote to downvote",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
        else if(confession.downvoteList.includes(voterID)){
            confession.downvoteList.pull(voterID);
            confession.update({
                userID: voterID, "userInteracted.userID": voterID}, 
                {$set: {"userInteracted.interaction": 0}
            });
            await confession.save();

            return res.status(201).json({
                message: "vote changed from downvote to none",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
        else{
            confession.downvoteList.push(voterID);
            confession.userInteracted.push({userID: voterID, "interaction": 1});
            await confession.save();

            return res.status(201).json({
                message: "vote added as downvote",
                "upvoteList": confession.upvoteList,
                "downvoteList": confession.downvoteList
            });
        }
    }
}

//confession information
exports.information = async (req, res) => {
    // returns all of the information about the confession. 
    confession = await Confession.findById(req.body.id);
    return res.json({confession: confession.toObject()});
}

