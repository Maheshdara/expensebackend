const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Expenses = require("../models/Expenses");
const getNextSequence = require("../models/Couter");
const Group = require("../models/Group");


// REGISTER
router.post("/register", async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    // Check if already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json("User already exists");
    }

    const user = new User({ email, phone, password });

    await user.save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});



router.post("/login", async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    let user;

    // Search by email or phone
    if (email) {
      user = await User.findOne({
        email: { $regex: new RegExp("^" + email + "$", "i") } // ignore case
      });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(400).json("User not found");
    }

    // Password case insensitive
    if (user.password.toLowerCase() !== password.toLowerCase()) {
      return res.status(400).json("Invalid credentials");
    }

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (err) {
    res.status(500).json(err);
  }
});





//get all users
router.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});






//get all expenses
router.get("/expenses", async (req, res) => {
  const users = await Expenses.find();
  res.json(users);
});


//get all group
router.get("/groups", async (req, res) => {
  const users = await Group.find();
  res.json(users);
});


// get expenses by userid
router.get("/expenses/:createdby", async (req, res) => {
  try {
    const createdby = req.params.createdby;

    console.log(createdby, "cretedby");


    if (!createdby) {
      return res.status(400).json({
        message: "Invalid phone number"
      });
    }

    const expenses = await Expenses.find({ createdby })
      .sort({ createdDate: -1 }); // recent first

    res.status(200).json(expenses);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});






//add edit expenses
router.post("/expenses", async (req, res) => {
  try {
    const body = req.body;
    console.log(req.body, "jjkjk");

    let savedExpense;


    if (!body.expenseId || body.expenseId === 0) {
      const newId = await getNextSequence("expenseId");

      savedExpense = new Expenses({
        name: body.name,
        amount: body.amount,
        createdby: body.createdby,
        user: body.user,
        createdDate: body.createdDate,
        location: body.location,
        expenseType: body.expenseType,
        expenseId: newId, // overwrite auto id,
        groupId: body.groupId,
        expenseDate: body.expenseDate
      });

      await savedExpense.save();

      if (savedExpense.groupId) {
        await sendGroupNotification(savedExpense,"added");
      }

      return res.json({
        message: "Expense added successfully",
        data: savedExpense
      });
    }


    savedExpense = await Expenses.findOneAndUpdate(
      { expenseId: body.expenseId },
      {
        $set: {
          name: body.name,
          amount: body.amount,
          createdby: body.createdby,
          user: body.user,
          createdDate: body.createdDate,
          location: body.location,
          expenseType: body.expenseType,
          groupId: body.groupId,
          expenseDate: body.expenseDate

        }
      },
      { new: true }
    );

    if (!savedExpense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    if (savedExpense.groupId) {
      await sendGroupNotification(savedExpense,"updated");
    }

    return res.json({
      message: "Expense updated successfully",
      data: savedExpense
    });



  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
});


//user summery
router.get("/expenses/summary/:createdby", async (req, res) => {
  try {
    const createdby = String(req.params.createdby);
    console.log(createdby, req, "lop");


    // Validate number
    if (!createdby) {
      return res.status(400).json({
        message: "Invalid createdby number"
      });
    }

    const expenses = await Expenses.find({ createdby });

    let moneyIn = 0;
    let moneyOut = 0;

    expenses.forEach((item) => {
      if (item.groupId == null) {
        if (item.expenseType === true) {
          moneyIn += Number(item.amount);
        } else {
          moneyOut += Number(item.amount);
        }
      }
    });

    const balance = moneyIn - moneyOut;

    res.status(200).json({
      message: "Expense summary fetched successfully",
      totalRecords: expenses.length,
      moneyIn,
      moneyOut,
      balance
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});


//group summery
router.get("/groupexpenses/summary/:groupid", async (req, res) => {
  try {
    const groupId = req.params.groupid;

    console.log(groupId, "lop");

    if (!groupId) {
      return res.status(400).json({
        message: "Invalid groupId"
      });
    }

    const expenses = await Expenses.find({ groupId });

    let moneyIn = 0;
    let moneyOut = 0;

    expenses.forEach((item) => {
      if (item.expenseType === true) {
        moneyIn += Number(item.amount);
      } else {
        moneyOut += Number(item.amount);
      }
    });

    const balance = moneyIn - moneyOut;

    res.status(200).json({
      message: "Expense summary fetched successfully",
      totalRecords: expenses.length,
      moneyIn,
      moneyOut,
      balance
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});



// CREATE / UPDATE GROUP API
router.post("/groups", async (req, res) => {
  try {
    const {
      id, // send 0 for create, existing group _id for update
      groupName,
      groupImage,
      createdbyId,
      user,
      members
    } = req.body;

    // validation
    if (!groupName) {
      return res.status(400).json({
        success: false,
        message: "Group name is required"
      });
    }

    let groupData;

    // CREATE
    if (!id || id === 0 || id === "0") {
      groupData = new Group({
        groupName,
        groupImage: groupImage || "",
        createdbyId,
        user,
        members: members || []
      });

      await groupData.save();

      return res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: groupData
      });
    }

    // UPDATE
    groupData = await Group.findByIdAndUpdate(
      id,
      {
        groupName,
        groupImage: groupImage || "",
        members: members || []
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!groupData) {
      return res.status(404).json({
        success: false,
        message: "Group not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: groupData
    });

  } catch (error) {
    console.log("Create / Update Group Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


//get specific user groups

// GET GROUPS WHERE USER PHONE EXISTS IN MEMBERS
router.get("/groups/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const groups = await Group.find({
      "members.phone": phone
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Groups fetched successfully",
      data: groups
    });

  } catch (error) {
    console.log("Get Groups Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


//group expenses
router.get("/groupexpenses/:groupId", async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const expenses = await Expenses.find({ groupId })
      .sort({ createdDate: -1 });

    res.status(200).json(expenses);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});


// save user tokens
router.post("/save-token", async (req, res) => {
  try {
    const { phone, fcmToken } = req.body;

    await User.updateOne(
      { phone },
      { $set: { fcmToken } }
    );

    res.json({ message: "Token saved" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});





const sendGroupNotification = async (expense,action) => {
  try {
    const group = await Group.findById(expense.groupId);

    if (!group) return;

    const phones = group.members.map(x => x.phone);

    const users = await User.find({
      phone: { $in: phones }
    });

    // Get Expo Tokens
    const tokens = users
      .map(x => x.fcmToken) // store expoToken in DB
      .filter(token => token);

    console.log(users, tokens, "users to notify");


    if (tokens.length === 0) return;

    // Get total expenses
    const expenses = await Expenses.find({
      groupId: expense.groupId
    });

    let moneyIn = 0;
    let moneyOut = 0;

    expenses.forEach((item) => {
      if (item.expenseType === true) {
        moneyIn += Number(item.amount);
      } else {
        moneyOut += Number(item.amount);
      }
    });

    const balance = moneyIn - moneyOut;
   
    const username = expense.user.split("@")[0] || expense.name

    const bodyText =
      `${expense.name} ₹${expense.amount} ${action} by ${username}. Balnce ₹${balance}`;

    // Expo messages array
    const messages = tokens.map(token => ({
      to: token,
      sound: "default",
      title: group.groupName,
      body: bodyText,
      data: {
        groupId: expense.groupId.toString()
      }
    }));

    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(messages)
      }
    );

    const result = await response.json();
    console.log(result);

  } catch (err) {
    console.log(err);
  }
};



router.delete("/expensesdelete/:expenseId", async (req, res) => {
  try {
    const expenseId = Number(req.params.expenseId);

    if (!expenseId) {
      return res.status(400).json({
        message: "Invalid expenseId"
      });
    }

    // Find and delete by custom expenseId
    const deletedExpense = await Expenses.findOneAndDelete({
      expenseId: expenseId
    });

    if (!deletedExpense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

  

    return res.json({
      message: "Expense deleted successfully",
      data: deletedExpense
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
});












// LOG middleware
router.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

module.exports = router;