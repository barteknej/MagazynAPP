using MagazynAPP.Models;

namespace MagazynAPP.Services
{
    public interface IUserService
    {
        User? Authenticate(string username, string password);
        IEnumerable<User> GetAll();
    }

}
