
window.fetchUser = async () => {
         try {
            const response = await axios.get("/api/webapi/GetUserInfo")
            userData = response?.data?.data

let avatarFile = userData.avatar;
        if (!avatarFile.includes('.png')) {
            avatarFile = `${avatarFile}.png`;
        }
        
        $("#avatar_display").attr("src", `/assets/png/${avatarFile}`)
                    $("#nickname_display").text(userData.name_user)
            $("#nickname_input").val(userData.name_user)
         } catch (error) {
            console.log(error)
         }
      }