using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MagazynAPP.Models;
using MagazynAPP.Services;

namespace MagazynAPP.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [AllowAnonymous]
        [HttpPost("authenticate")]
        public ActionResult<User> Authenticate([FromBody] User userParam)
        {
            var user = _userService.Authenticate(userParam.Username ?? string.Empty, userParam.Password ?? string.Empty);

            if (user == null)
                return BadRequest(new { message = "Username or password is incorrect" });

            return Ok(user);
        }
    }
}
